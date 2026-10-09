import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { addDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ROLES } from "./roles";
import { readFile, analyze, findRole } from "./analyze";
import { aiAnalyze, aiExtract, suggestRoles } from "./gemini";

/* ---------- icons ---------- */
const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ChipIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" {...line} stroke="#7a00ff">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#7a00ff" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="#fff" stroke="none" />
    <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
  </svg>
);
const CloudIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24">
    <g fill="#8b3dff"><circle cx="8" cy="14" r="4" /><circle cx="13" cy="10" r="5" /><circle cx="17" cy="14" r="4" /><rect x="8" y="13" width="9" height="5" /></g>
    <path d="M12.5 17v-6m-2.5 2.5 2.5-2.5 2.5 2.5" {...line} stroke="#fff" strokeWidth="2.2" />
  </svg>
);
const WandIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...line}>
    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72M14 7l3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9" />
  </svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...line}><path d="m12 19-7-7 7-7M19 12H5" /></svg>
);
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/* ---------- app shell: header + which page to show ---------- */
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home"); // home | result | dashboard
  const [result, setResult] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const go = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };
  const show = (r) => {
    setResult(r);
    go("result");
  };

  return (
    <>
      <header className="nav">
        <div className="nav-in">
          <button className="brand" onClick={() => go("home")}>
            <ChipIcon /> <span>Resume<em>AI</em></span>
          </button>
          <nav>
            {user ? (
              <>
                <button className="link" onClick={() => go("dashboard")}>Dashboard</button>
                {user.photoURL && <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
                <button className="dark" onClick={() => signOut(auth)}>Logout</button>
              </>
            ) : (
              <button className="dark" onClick={() => setShowLogin(true)}>Login / Register</button>
            )}
          </nav>
        </div>
      </header>

      {/* Home stays mounted (just hidden) so your text is still there when you come back */}
      <div hidden={page !== "home"}>
        <Home user={user} onDone={show} />
      </div>
      {page === "result" && result && <Result r={result} onHome={() => go("home")} />}
      {page === "dashboard" && <Dashboard user={user} openLogin={() => setShowLogin(true)} onOpen={show} />}
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </>
  );
}

/* ---------- page 1: upload + analyze ---------- */
function Home({ user, onDone }) {
  const [role, setRole] = useState("");
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file) {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setText("");
    setReading(true);
    try {
      let t = await readFile(file);
      // scanned PDF with no selectable text: let Gemini read it
      if (t.trim().length < 50 && file.name.toLowerCase().endsWith(".pdf")) t = await aiExtract(file);
      setText(t.trim());
      if (t.trim().length < 50) setError("Could not read text from this file. Paste your resume text below.");
    } catch (e) {
      setError(e.message);
    }
    setReading(false);
  }

  async function run() {
    if (!role.trim()) return setError("Type or pick a job role first.");
    if (text.trim().length < 50) return setError("Upload a resume or paste your resume text first.");
    setBusy(true);
    setError("");
    let res;
    try {
      res = await aiAnalyze(text, role.trim());
    } catch (e) {
      console.warn(e);
      const local = findRole(role); // offline fallback if the API fails
      if (local) res = { ...analyze(text, local.id), note: "The AI service was unavailable, so this score comes from the offline checker." };
    }
    setBusy(false);
    if (!res) return setError("The AI service is unavailable and this role is not in the offline list. Try again in a minute.");
    res.fileName = fileName || "Pasted text";
    if (user) addDoc(collection(db, "analyses"), { uid: user.uid, ...res, createdAt: serverTimestamp() }).catch(console.warn);
    onDone(res);
  }

  return (
    <main className="home">
      <h1>Analyze your resume instantly with <span>AI</span></h1>
      <div className="panel">
        <div className="field">
          <label htmlFor="role">Target Job Role</label>
          <RoleInput value={role} onChange={setRole} />
        </div>
        <label className="drop">
          <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => pick(e.target.files[0])} />
          <CloudIcon />
          <b>{reading ? "Reading your resume..." : fileName || "Click to upload PDF or DOCX"}</b>
        </label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Extracted text will appear here..." aria-label="Resume text" />
        {error && <p className="error">{error}</p>}
        <button className="go" onClick={run} disabled={busy || reading}>
          <WandIcon /> {busy ? "AI is analyzing your profile..." : "Analyze Resume"}
        </button>
      </div>
    </main>
  );
}

/* ---------- page 2: results ---------- */
function Result({ r, onHome }) {
  const C = 2 * Math.PI * 54;
  const label = r.score >= 75 ? "Strong match" : r.score >= 50 ? "Decent match" : "Needs work";
  return (
    <main className="page">
      <button className="back" onClick={onHome}><BackIcon /> Back to Home</button>
      <h2>Your Analysis Dashboard</h2>
      <p className="sub">{r.role}{r.fileName ? ` - ${r.fileName}` : ""}</p>
      {r.note && <p className="note">{r.note}</p>}

      <div className="grid">
        <section className="card center">
          <h3>ATS Match Score</h3>
          <svg viewBox="0 0 120 120" width="180" role="img" aria-label={`Score ${r.score} percent`}>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#ece4fb" strokeWidth="10" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#7a00ff" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - r.score / 100)} transform="rotate(-90 60 60)" />
            <text x="60" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill="#12122b">{r.score}%</text>
          </svg>
          <p className="sub">{label}</p>
        </section>

        <section className="card">
          <h3>Skill Gaps Identified</h3>
          <div className="chips">
            {r.missing.length ? r.missing.map((s) => <span className="chip gap" key={s}>{s}</span>) : <p>No gaps. All key skills found.</p>}
          </div>
          <h3>Skills Found</h3>
          <div className="chips">
            {r.found.length ? r.found.map((s) => <span className="chip" key={s}>{s}</span>) : <p>None of the key skills were found.</p>}
          </div>
        </section>

        <section className="card">
          <h3>Top Career Matches</h3>
          {r.matches.map((m) => (
            <div className="bar" key={m.name}>
              <span>{m.name}</span>
              <b>{m.pct}%</b>
              <i style={{ "--w": m.pct + "%" }} />
            </div>
          ))}
        </section>

        <section className="card wide">
          <h3>AI Improvement Tips</h3>
          <ul>{r.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      </div>
      <button className="go inline" onClick={onHome}>Analyze Another Resume</button>
    </main>
  );
}

/* ---------- saved analyses (needs login) ---------- */
function Dashboard({ user, openLogin, onOpen }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "analyses"), where("uid", "==", user.uid)))
      .then((s) =>
        setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      )
      .catch(() => setItems([]));
  }, [user]);

  if (!user)
    return (
      <main className="page">
        <h2>Dashboard</h2>
        <p className="sub">Login to see your saved analyses.</p>
        <button className="dark" onClick={openLogin}>Login / Register</button>
      </main>
    );

  return (
    <main className="page">
      <h2>Your Dashboard</h2>
      <p className="sub">Click an analysis to open it again.</p>
      {items === null && <p>Loading...</p>}
      {items && items.length === 0 && <p>Nothing saved yet. Analyze a resume while logged in and it will appear here.</p>}
      {(items || []).map((i) => (
        <button className="card row" key={i.id} onClick={() => onOpen(i)}>
          <span>
            <b>{i.role}</b>
            <small>{i.fileName}</small>
            <small>{i.createdAt?.toDate().toLocaleDateString()}</small>
          </span>
          <strong>{i.score}%</strong>
        </button>
      ))}
    </main>
  );
}

/* ---------- Google sign-in popup ---------- */
function Login({ onClose }) {
  const [error, setError] = useState("");

  async function google() {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onClose();
    } catch (e) {
      const msgs = {
        "auth/popup-closed-by-user": "The sign-in window was closed. Try again.",
        "auth/popup-blocked": "Your browser blocked the popup. Allow popups for this site and try again.",
        "auth/operation-not-allowed": "Google sign-in is off. Firebase console > Authentication > Sign-in method > Google > Enable.",
        "auth/unauthorized-domain": "This domain is not allowed. Open the app at localhost (not 127.0.0.1) or add the domain in Firebase console > Authentication > Settings > Authorized domains.",
      };
      setError(msgs[e.code] || e.message);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome to ResumeAI</h2>
        <p>Sign in to save your analyses and open them later from your dashboard.</p>
        <button className="google" onClick={google}><GoogleIcon /> Continue with Google</button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

/* ---------- role box with suggestions (preset roles + AI) ---------- */
function RoleInput({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState([]);

  useEffect(() => {
    if (value.trim().length < 3) {
      setAi([]);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      suggestRoles(value)
        .then((r) => !stale && Array.isArray(r) && setAi(r.map(String).slice(0, 6)))
        .catch(() => {});
    }, 600);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [value]);

  const q = value.toLowerCase().trim();
  const local = ROLES.filter((r) => r.name.toLowerCase().includes(q)).map((r) => ({ name: r.name, tag: r.group }));
  const extra = ai
    .filter((n) => !local.some((l) => l.name.toLowerCase() === n.toLowerCase()))
    .map((n) => ({ name: n, tag: "AI suggestion" }));
  const items = q ? [...local, ...extra].slice(0, 9) : local;

  return (
    <div className="combo">
      <input
        id="role"
        value={value}
        autoComplete="off"
        placeholder="e.g., Software Developer..."
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && items.length > 0 && (
        <ul className="suggest" role="listbox">
          {items.map((s) => (
            <li key={s.name} role="option" aria-selected="false" onMouseDown={() => { onChange(s.name); setOpen(false); }}>
              {s.name}
              <small>{s.tag}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

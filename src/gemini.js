// Gemini API calls: score a resume, read scanned PDFs, suggest job roles.
// If Google retires the model, change MODEL. The key lives in .env as VITE_GEMINI_API_KEY.
const MODEL = "gemini-3.6-flash";
const KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function ask(parts) {
  if (!KEY) throw new Error("Missing VITE_GEMINI_API_KEY in .env");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const pct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const list = (x) => (Array.isArray(x) ? x.map(String) : []);

// Scanned PDF -> text (Gemini reads the PDF directly)
export async function aiExtract(file) {
  const pdf = { inline_data: { mime_type: "application/pdf", data: await toBase64(file) } };
  const j = await ask([pdf, { text: 'Extract all the text from this resume. Reply with JSON only: {"text": "the full resume text"}' }]);
  return String(j.text || "");
}

// Resume text + role -> score, gaps, career matches, tips
export async function aiAnalyze(text, role) {
  const prompt = `You are a strict ATS resume reviewer. Target job role: "${role}".
RESUME:
${text.slice(0, 20000)}

Reply with JSON only, in this shape:
{"score": 0-100 ATS match for the role,
 "found": ["skills the role needs that the resume shows"],
 "missing": ["up to 8 important skills the resume lacks"],
 "matches": [{"name": "job title", "pct": 0-100}] (the 3 best-fitting careers),
 "tips": ["4 to 6 short, specific improvements"]}`;
  const j = await ask([{ text: prompt }]);
  if (j.score == null) throw new Error("Unexpected AI response");
  return {
    score: pct(j.score),
    role,
    found: list(j.found),
    missing: list(j.missing),
    matches: (Array.isArray(j.matches) ? j.matches : []).slice(0, 3).map((m) => ({ name: String(m.name), pct: pct(m.pct) })),
    tips: list(j.tips),
  };
}

// Job-title suggestions while the user types a profession
export const suggestRoles = (text) =>
  ask([{ text: `Suggest 6 real job titles related to "${text}". Reply with a JSON array of strings only.` }]);

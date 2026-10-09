import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import { ROLES } from "./roles";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Step 1: read the text out of a PDF, DOCX or TXT file
export async function readFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      text += (await page.getTextContent()).items.map((it) => it.str).join(" ") + "\n";
    }
    return text;
  }
  if (name.endsWith(".docx")) {
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (name.endsWith(".txt")) return file.text();
  throw new Error("Please upload a PDF, DOCX or TXT file.");
}

// Does the resume text contain this skill as a whole word/phrase?
const has = (text, skill) => {
  const safe = skill.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${safe}($|[^a-z0-9])`).test(text);
};

const skillMatch = (text, role) => {
  const found = role.skills.filter((s) => has(text, s));
  return { found, missing: role.skills.filter((s) => !found.includes(s)) };
};

// Step 2: resume quality checks (30 points in total)
const CHECKS = [
  { pts: 5, ok: (t) => /[\w.+-]+@[\w-]+\.[\w.]+/.test(t), tip: "Add a professional email address at the top." },
  { pts: 3, ok: (t) => /\+?\d[\d\s-]{8,}\d/.test(t), tip: "Add your phone number." },
  { pts: 5, ok: (t) => /experience|internship|work history/.test(t), tip: "Add an Experience or Internship section." },
  { pts: 4, ok: (t) => /education|degree|university|college/.test(t), tip: "Add an Education section." },
  { pts: 5, ok: (t) => /projects?/.test(t), tip: "Add a Projects section with 2-3 relevant projects." },
  { pts: 3, ok: (t) => /summary|objective|profile/.test(t), tip: "Start with a 2-line professional summary." },
  { pts: 3, ok: (t) => /\d+\s?%|\d+\+|[$₹]\s?\d|\d+\s?(users|clients|customers|projects)/.test(t), tip: "Add measurable results, for example: improved page speed by 30%." },
  { pts: 2, ok: (t) => { const w = t.split(" ").length; return w >= 200 && w <= 900; }, tip: "Keep your resume between 200 and 900 words (1-2 pages)." },
];

// Step 3: score = 70% skills match + 30% resume quality
export function analyze(rawText, roleId) {
  const text = rawText.toLowerCase().replace(/\s+/g, " ");
  const role = ROLES.find((r) => r.id === roleId);
  const { found, missing } = skillMatch(text, role);
  const passed = CHECKS.filter((c) => c.ok(text));
  const quality = passed.reduce((sum, c) => sum + c.pts, 0);
  const score = Math.round((found.length / role.skills.length) * 70 + quality);

  const matches = ROLES.map((r) => ({
    id: r.id,
    name: r.name,
    pct: Math.round((skillMatch(text, r).found.length / r.skills.length) * 100),
  }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const tips = CHECKS.filter((c) => !passed.includes(c)).map((c) => c.tip);
  if (missing.length) tips.unshift(`Add these ${role.name} skills if you have them: ${missing.slice(0, 4).join(", ")}.`);
  if (!tips.length) tips.push("Strong resume. Tailor the summary to each job description before you apply.");

  return { score, role: role.name, found, missing, matches, tips };
}

// Offline fallback: match whatever the user typed to one of our preset roles
export function findRole(text) {
  const t = text.toLowerCase().trim();
  const words = t.split(/\W+/).filter((w) => w.length > 2);
  let best = null;
  let top = 0;
  for (const r of ROLES) {
    const n = r.name.toLowerCase();
    const score = n === t ? 99 : words.filter((w) => n.includes(w)).length;
    if (score > top) { best = r; top = score; }
  }
  return best;
}

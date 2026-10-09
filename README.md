# ResumeAI - Resume Analyzer

React + Vite + Firebase (Auth, Firestore, Hosting). Upload a PDF/DOCX resume, pick a target role, get an ATS score, skill gaps, top career matches and tips. Analysis runs in the browser (keyword matching), so no paid AI key is needed.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Firebase values and your Gemini key. (`.env` is git-ignored, so only the blank template goes to GitHub.)
3. `npm run dev`

## Firebase setup (console.firebase.google.com)
- Authentication -> Sign-in method -> enable **Google** (choose a support email). `localhost` and your `web.app` domain are allowed by default, so open the app at `http://localhost:5173`, not `127.0.0.1`.
- Firestore Database -> create database, then set these rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /analyses/{id} {
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
    }
  }
}
```

## Deploy
`npm run build` then `npx firebase-tools login` and `npx firebase-tools deploy --only hosting`

## Add or edit job roles
Open `src/roles.js` and add a line with `tech(...)` or `non(...)`: id, display name, list of skills.

## Push to GitHub
`git init && git add . && git commit -m "ResumeAI" && git branch -M main && git remote add origin <your-repo-url> && git push -u origin main`

## AI (Gemini)
- Put your Gemini key in `.env` as `VITE_GEMINI_API_KEY`. Do not paste it into source files or commit it.
- Gemini reads the resume (PDF directly, DOCX/TXT as text), scores it for the role you typed, and suggests job titles while you type. See `src/gemini.js` (change `MODEL` there if Google retires it).
- If the API fails, the app falls back to the offline keyword checker for roles in `src/roles.js`.
- Keys used in browser code are visible to anyone. In Google Cloud Console -> Credentials, restrict the key to your site URLs and to the Generative Language API.
- The file must be named exactly `.env` (not `.env.txt`), sit next to `package.json`, and you must restart `npm run dev` after editing it.

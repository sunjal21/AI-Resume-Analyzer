import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Values come from your local .env file (copy .env.example to .env and fill it in).
// .env is git-ignored, so only the blank .env.example goes to GitHub.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey?.startsWith("AIza") || !firebaseConfig.appId?.includes(":")) {
  throw new Error(
    "Firebase config missing or wrong. Copy .env.example to .env (same folder as package.json), fill in VITE_FIREBASE_API_KEY (starts with AIza) and VITE_FIREBASE_APP_ID (looks like 1:123:web:abc), then restart npm run dev."
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

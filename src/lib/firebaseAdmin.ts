import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Firebase Admin SDK. Reads a service-account JSON from the
// FIREBASE_SERVICE_ACCOUNT env var. The Admin SDK bypasses Firestore security
// rules, so all client-facing access goes through server API routes and the
// rules themselves can stay fully locked.
//
// Initialization is LAZY (only on first use) so that importing this module
// during `next build` does not throw when the env var is absent.
function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT env var is missing. Add the service-account JSON in Vercel and .env.local."
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }
}

let cached: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (cached) return cached;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(getServiceAccount()) });
  cached = getFirestore(app);
  return cached;
}

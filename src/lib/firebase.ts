import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeFirestore, getFirestore, setLogLevel, memoryLocalCache, memoryLruGarbageCollector, Firestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Suppress internal Firestore connection notices in preview sandboxes
setLogLevel("silent");

// Initialize Firebase App safely (singleton)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
export const auth = getAuth(app);

const databaseId = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId !== "(default)"
  ? (firebaseConfig as any).firestoreDatabaseId
  : undefined;

let firestoreDb: Firestore;

try {
  firestoreDb = databaseId 
    ? initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          localCache: memoryLocalCache({ garbageCollector: memoryLruGarbageCollector() }),
        },
        databaseId
      )
    : initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          localCache: memoryLocalCache({ garbageCollector: memoryLruGarbageCollector() }),
        }
      );
} catch (e) {
  firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreDb;
export default app;

// Secondary Auth instance helper to register staff in Firebase Authentication
// without logging out the currently signed-in Master Admin.
export async function createStaffInFirebaseAuth(email: string, pass: string): Promise<boolean> {
  if (!email || !pass) return false;
  try {
    const secondaryApp = getApps().find((a) => a.name === "SecondaryAuth") || initializeApp(firebaseConfig as any, "SecondaryAuth");
    const secondaryAuth = getAuth(secondaryApp);
    await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), pass.trim());
    await signOut(secondaryAuth);
    return true;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log(`Firebase Auth account for ${email} already exists.`);
      return true;
    }
    console.warn(`Notice registering ${email} in Firebase Auth:`, err.message || err);
    return false;
  }
}

// Automatically ensure Master Admin (junubposcenter@gmail.com / Reagantekki01) exists in Firebase Auth
export async function ensureMasterAdminAuthRegistered(): Promise<void> {
  try {
    await createStaffInFirebaseAuth('junubposcenter@gmail.com', 'Reagantekki01');
  } catch (e) {
    // Ignore errors
  }
}





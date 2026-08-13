import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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




import app, { auth, db } from "../lib/firebase";

// Online connection guard
if (typeof navigator !== "undefined" && !navigator.onLine) {
  console.warn("Internet connection required for live operations");
}

export { auth, db };
export default app;

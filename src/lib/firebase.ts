import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn("Firebase persistence failed: Multiple tabs open.");
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn("Firebase persistence not supported in this browser.");
  }
});

export const auth = getAuth(app);
export const storage = getStorage(app);

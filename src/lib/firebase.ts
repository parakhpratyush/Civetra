import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Dynamic Auth Domain selection to prevent Cross-Origin errors on different deployments
const getAuthDomain = () => {
  const host = window.location.hostname;
  // If running on App Hosting or standard Firebase Hosting, use the current host
  if (host.includes("hosted.app") || host.includes("firebaseapp.com") || host.includes("web.app")) {
    return host;
  }
  return firebaseConfig.authDomain;
};

const finalConfig = {
  ...firebaseConfig,
  authDomain: getAuthDomain()
};

export const app = initializeApp(finalConfig);

// Modern Firestore Initialization with Multi-Tab Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const storage = getStorage(app);

// Debug Log for Auth Environment
console.log("🚀 Civetra Auth Initialized on domain:", finalConfig.authDomain);

import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Build version to track deployment updates
const BUILD_VERSION = "1.0.4 - " + new Date().toISOString();

// Dynamic Auth Domain selection to prevent Cross-Origin errors on different deployments
const getAuthDomain = () => {
  if (typeof window === 'undefined') return firebaseConfig.authDomain;
  const host = window.location.hostname;
  
  // Force same-origin authentication for any firebase-related domains
  if (host.includes("hosted.app") || host.includes("web.app") || host.includes("firebaseapp.com")) {
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
console.log(`🚀 Civetra [${BUILD_VERSION}] initialized on:`, finalConfig.authDomain);

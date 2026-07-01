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

export const app = initializeApp(firebaseConfig);

// Modern Firestore Initialization with Multi-Tab Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const storage = getStorage(app);

// Debug Log for Auth Environment
console.log(`🚀 Civetra [${BUILD_VERSION}] initialized on:`, firebaseConfig.authDomain);

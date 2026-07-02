import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBe0n4b1iIemFx898anZdoc-wtkZED8mCQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "civetra.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "civetra",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "civetra.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "382651028258",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:382651028258:web:a326a5f9650cae1f9c4b7b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-61F2MF882V"
};

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

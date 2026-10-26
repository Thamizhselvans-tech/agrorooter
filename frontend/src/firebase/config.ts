import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Agri Rover AI — Firebase Web App Configuration
export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyDFc6c5MzdjQRI4oDZlabYl-MYuhlQT4xE",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "agrorroter.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "agrorroter",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "agrorroter.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "316931696830",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:316931696830:web:1b05c5e4186a66d77ad6ef",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || "G-QL1Y8BYGKY"
};

// Initialize Firebase safely (avoid multi-instance duplication in dev)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Analytics conditionally (only supported in browser environments)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics is non-critical
  });
}

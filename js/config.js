/* =========================================
   INDIANA LOUNGE — Configuración
   Firebase + Cloudinary
   ========================================= */

// ⚠️ COMPLETAR con los datos de tu proyecto Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMk9HN4gfBg-Ybj2yTJERnvjnjZ0VyoUQ",
  authDomain: "indiana-restaurante.firebaseapp.com",
  projectId: "indiana-restaurante",
  storageBucket: "indiana-restaurante.firebasestorage.app",
  messagingSenderId: "337104328115",
  appId: "1:337104328115:web:e971b5e184f64a1c6ea7c6"
};

// ⚠️ COMPLETAR con los datos de tu cuenta Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName:    "dhzqelo1n",
    uploadPreset: "indiana_uploads"  // Nombre del unsigned preset que crearás
};

// ────────────────────────────────────────
//  Inicialización Firebase
// ────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.firestore();
const auth = firebase.auth();

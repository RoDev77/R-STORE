// Firebase Konfigurasi - GANTI DENGAN PUNYA ANDA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBKmEOkiP8qdoAOjdPxRbBttbCdcZvzpGg",
  authDomain: "r-store77.firebaseapp.com",
  projectId: "r-store77",
  storageBucket: "r-store77.firebasestorage.app",
  messagingSenderId: "109616657476",
  appId: "1:109616657476:web:f9f994b9f7a208914af811"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, serverTimestamp };
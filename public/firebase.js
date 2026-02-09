// firebase.js - Letakkan di folder yang sama dengan index.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Export database instance
export { db };
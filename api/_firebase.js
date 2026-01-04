/* _firebase.js */

import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
    );

    if (!serviceAccount.project_id) {
      throw new Error("Invalid Firebase service account configuration");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error.message);
    throw new Error("Failed to initialize Firebase: " + error.message);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    )
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Order ID wajib" });
    }

    const doc = await db.collection("orders").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }

    return res.status(200).json(doc.data());

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
}

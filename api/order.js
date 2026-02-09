import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function pickPublicOrder(data) {
  // Return yang aman untuk publik (tracking)
  return {
    orderId: data.orderId || "-",
    username: data.username || "-",
    amount: data.amount || 0,
    price: data.price || "-",
    pricePerRobux: data.pricePerRobux || 0,
    deliveryType: data.deliveryType || "-",
    status: String(data.status || "PENDING").toUpperCase(),
    createdAt: data.createdAt || null,

    // optional kalau kamu simpan
    timeline: data.timeline || null,
  };
}

export default async function handler(req, res) {
  try {
    // CORS (opsional, kalau beda domain)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    // POST = CREATE ORDER (kalau kamu pakai)
    if (req.method === "POST") {
      const data = req.body;

      if (!data?.orderId) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      // minimal hardening: status + createdAt set server
      const payload = {
        ...data,
        status: String(data.status || "PENDING").toUpperCase(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("orders").doc(payload.orderId).set(payload, { merge: true });
      return res.status(200).json({ success: true });
    }

    // GET = LOAD ORDER
    if (req.method === "GET") {
      const { searchParams } = new URL(req.url, "http://localhost");
      const id = String(searchParams.get("id") || "").trim().toUpperCase();

      if (!id) {
        return res.status(400).json({ error: "Missing orderId" });
      }

      const snap = await db.collection("orders").doc(id).get();

      if (!snap.exists) {
        return res.status(404).json({ error: "Order not found" });
      }

      const data = snap.data() || {};
      return res.status(200).json(pickPublicOrder(data));
    }

    return res.status(405).end();
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

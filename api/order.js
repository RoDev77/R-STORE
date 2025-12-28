import { db } from "./_firebase";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const data = req.body;

      if (!data.orderId) {
        return res.status(400).json({ error: "Order ID wajib" });
      }

      await db.collection("orders").doc(data.orderId).set({
        ...data,
        status: "PENDING",
        createdAt: Date.now(),
      });

      return res.json({ success: true });
    }

    if (req.method === "GET") {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "ID kosong" });
      }

      const snap = await db.collection("orders").doc(id).get();

      if (!snap.exists) {
        return res.status(404).json({ error: "Order tidak ditemukan" });
      }

      return res.json(snap.data());
    }

    res.status(405).end();
  } catch (err) {
    console.error("API ERROR:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

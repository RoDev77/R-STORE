import { db } from "./firebase";

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const id = searchParams.get("id");

  if (req.method === "GET") {
    if (!id) {
      return res.status(400).json({ error: "Order ID wajib" });
    }

    const snap = await db.collection("orders").doc(id).get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }

    return res.json(snap.data());
  }

  res.status(405).end();
}

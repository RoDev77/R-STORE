import { db } from "../_firebase.js";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const ordersSnapshot = await db.collection("orders")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      const orders = [];
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          orderId: data.orderId || doc.id,
          username: data.username || data.userName || "-",
          amount: data.amount || 0,
          price: data.price || "Rp 0",
          delivery: data.delivery || data.deliveryType || "Instant",
          deliveryType: data.deliveryType || data.delivery || "Instant",
          status: (data.status || "pending").toLowerCase(),
          createdAt: data.createdAt || new Date().toISOString(),
          verifiedAt: data.verifiedAt || null,
          processingAt: data.processingAt || null,
          completedAt: data.completedAt || null,
          pricePerRobux: data.pricePerRobux || 115,
          proofUrl: data.proofUrl || null
        });
      });

      return res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      console.error("Error listing orders:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to list orders",
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed"
  });
}
import { db } from "../_firebase.js";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "PUT") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Order ID is required"
      });
    }

    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: "Status is required"
        });
      }

      const updateData = {
        status: status.toLowerCase()
      };

      // Add timestamps based on status
      const now = new Date().toISOString();

      if (status.toLowerCase() === "processing") {
        updateData.verifiedAt = now;
        updateData.processingAt = now;
      } else if (status.toLowerCase() === "completed") {
        updateData.completedAt = now;
        // Ensure previous timestamps exist
        const doc = await db.collection("orders").doc(id).get();
        if (doc.exists) {
          const data = doc.data();
          if (!data.verifiedAt) updateData.verifiedAt = now;
          if (!data.processingAt) updateData.processingAt = now;
        }
      } else if (status.toLowerCase() === "rejected") {
        updateData.rejectedAt = now;
      }

      updateData.updatedAt = now;

      await db.collection("orders").doc(id).update(updateData);

      console.log(`✅ Order ${id} updated to ${status}`);

      return res.status(200).json({
        success: true,
        message: "Order updated successfully",
        data: { orderId: id, status: status.toLowerCase() }
      });
    } catch (error) {
      console.error("❌ Error updating order:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update order",
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed"
  });
}
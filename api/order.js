/* order.js */

import { db } from "./_firebase.js";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET: Retrieve order by ID
  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: "Order ID is required" 
      });
    }

    try {
      const orderDoc = await db.collection("orders").doc(id).get();

      if (!orderDoc.exists) {
        return res.status(404).json({ 
          success: false,
          error: "Order not found" 
        });
      }

      const orderData = orderDoc.data();

      return res.status(200).json({
        success: true,
        data: {
          id: orderDoc.id,
          ...orderData,
          createdAt: orderData.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: orderData.updatedAt?.toDate?.()?.toISOString() || null,
        }
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      return res.status(500).json({ 
        success: false,
        error: "Internal server error",
        message: error.message 
      });
    }
  }

  // POST: Create new order
  if (req.method === "POST") {
    try {
      const { amount, price, username, delivery } = req.body;

      if (!amount || !price || !username) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: amount, price, username"
        });
      }

      const orderData = {
        amount: parseInt(amount),
        price: price,
        username: username,
        delivery: delivery || "instant",
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const orderRef = await db.collection("orders").add(orderData);

      return res.status(201).json({
        success: true,
        data: {
          id: orderRef.id,
          ...orderData
        }
      });
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create order",
        message: error.message
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ 
    success: false,
    error: "Method not allowed" 
  });
}

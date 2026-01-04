import { db } from "./_firebase.js";
import admin from "firebase-admin";

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

      // Normalize field names for compatibility
      return res.status(200).json({
        success: true,
        data: {
          id: orderDoc.id,
          orderId: orderData.orderId || orderDoc.id,
          username: orderData.username || orderData.userName || "-",
          amount: orderData.amount || 0,
          price: orderData.price || "Rp 0",
          delivery: orderData.delivery || orderData.deliveryType || "Instant",
          deliveryType: orderData.deliveryType || orderData.delivery || "Instant",
          status: (orderData.status || "pending").toLowerCase(),
          createdAt: orderData.createdAt || new Date().toISOString(),
          verifiedAt: orderData.verifiedAt || null,
          processingAt: orderData.processingAt || null,
          completedAt: orderData.completedAt || null,
          pricePerRobux: orderData.pricePerRobux || 115
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
      const { orderId, amount, price, username, delivery, deliveryType, userName } = req.body;

      if (!orderId || !amount || !price || (!username && !userName)) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: orderId, amount, price, username"
        });
      }

      const finalUsername = username || userName;

      const orderData = {
        orderId: orderId,
        amount: parseInt(amount),
        price: price,
        username: finalUsername,
        userName: finalUsername,
        delivery: delivery || deliveryType || "instant",
        deliveryType: deliveryType || delivery || "instant",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        verifiedAt: null,
        processingAt: null,
        completedAt: null,
        pricePerRobux: 115
      };

      // Use orderId as document ID for easy lookup
      await db.collection("orders").doc(orderId).set(orderData);

      console.log(`✅ Order created: ${orderId}`);

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: orderData
      });
    } catch (error) {
      console.error("❌ Error creating order:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create order",
        message: error.message
      });
    }
  }

  // PUT: Update order status
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
      
      const updateData = {
        status: status
      };

      // Add timestamp based on status
      if (status === "processing") {
        updateData.verifiedAt = new Date().toISOString();
        updateData.processingAt = new Date().toISOString();
      } else if (status === "completed") {
        updateData.completedAt = new Date().toISOString();
      }

      await db.collection("orders").doc(id).update(updateData);

      console.log(`✅ Order updated: ${id} -> ${status}`);

      return res.status(200).json({
        success: true,
        message: "Order updated successfully"
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

  // Method not allowed ada
  return res.status(405).json({ 
    success: false,
    error: "Method not allowed" 
  });
}
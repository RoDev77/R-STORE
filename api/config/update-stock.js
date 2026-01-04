import { db } from "../_firebase.js";
import admin from "firebase-admin";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { amount } = req.body;

      if (!amount || amount < 0) {
        return res.status(400).json({
          success: false,
          error: "Valid amount is required"
        });
      }

      const configRef = db.collection("config").doc("robux");
      
      // Get current config
      const configDoc = await configRef.get();
      
      if (!configDoc.exists) {
        return res.status(404).json({
          success: false,
          error: "Config not found"
        });
      }

      const currentConfig = configDoc.data();
      const currentStock = currentConfig.currentStock || 0;
      const currentPO = currentConfig.currentPO || 0;

      let newStock = currentStock;
      let newPO = currentPO;

      // Deduct from stock first
      if (amount <= currentStock) {
        // All from stock
        newStock = currentStock - amount;
      } else {
        // Partial from stock, rest from PO
        const fromStock = currentStock;
        const fromPO = amount - fromStock;
        
        newStock = 0;
        newPO = Math.max(0, currentPO - fromPO);
      }

      // Update Firestore
      await configRef.update({
        currentStock: newStock,
        currentPO: newPO,
        lastOrderAmount: amount,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Stock updated: Stock ${currentStock} → ${newStock}, PO ${currentPO} → ${newPO}`);

      return res.status(200).json({
        success: true,
        message: "Stock updated successfully",
        data: {
          previousStock: currentStock,
          newStock: newStock,
          previousPO: currentPO,
          newPO: newPO,
          deducted: amount
        }
      });
    } catch (error) {
      console.error("❌ Error updating stock:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update stock",
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed"
  });
}
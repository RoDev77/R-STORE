import { db } from "./_firebase.js";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET: Retrieve config from Firestore
  if (req.method === "GET") {
    try {
      const configDoc = await db.collection("config").doc("robux").get();

      if (!configDoc.exists) {
        // Return default config if not exists in Firestore
        console.log("⚠️ Config not found in Firestore, using defaults");
        return res.status(200).json({
          success: true,
          data: {
            currentPO: 0,
            currentStock: 10000,
            poLimit: 10000,
            pricePerRobux: 115
          }
        });
      }

      const configData = configDoc.data();

      const config = {
        currentPO: configData.currentPO || 0,
        currentStock: configData.currentStock || 0,
        poLimit: configData.poLimit || 10000,
        pricePerRobux: configData.pricePerRobux || 115
      };

      console.log("✅ Config loaded from Firestore:", config);

      return res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error("❌ Error fetching config:", error);
      
      // Return default config on error
      return res.status(200).json({
        success: true,
        data: {
          currentPO: 0,
          currentStock: 10000,
          poLimit: 10000,
          pricePerRobux: 115
        }
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: "Method not allowed"
  });
}
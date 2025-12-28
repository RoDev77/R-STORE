import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      username,
      amount,
      price,
      deliveryType,
      poInfo,
      proofImage
    } = req.body;

    if (!username || !amount || !price || !proofImage) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const orderId = "RBX-" + Date.now();

    const orderData = {
      orderId,
      username,
      amount,
      price,
      deliveryType,
      poInfo,
      status: "PENDING",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // SAVE TO FIRESTORE
    await db.collection("orders").doc(orderId).set(orderData);

    // SEND TO DISCORD
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "🎮 Pesanan Robux Baru",
          color: 5763719,
          fields: [
            { name: "Order ID", value: orderId },
            { name: "Username", value: username },
            { name: "Robux", value: amount.toString(), inline: true },
            { name: "Total", value: price, inline: true },
            { name: "Delivery", value: deliveryType },
            { name: "Info", value: poInfo }
          ],
          image: { url: proofImage }
        }]
      })
    });

    return res.status(200).json({ success: true, orderId });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

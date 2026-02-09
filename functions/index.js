const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const DISCORD_WEBHOOK =
  "https://discord.com/api/webhooks/XXXXX/XXXXX";

exports.onOrderCreate = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap) => {
    const order = snap.data();

    // ===== UPDATE STOCK =====
    const configRef = db.doc("config/robux");
    const configSnap = await configRef.get();

    const stock = Number(configSnap.data().currentStock || 0);

    if (order.amount <= stock) {
      await configRef.update({
        currentStock: admin.firestore.FieldValue.increment(-order.amount)
      });
    } else {
      const po = order.amount - stock;
      await configRef.update({
        currentStock: 0,
        currentPO: admin.firestore.FieldValue.increment(po)
      });
    }

    // ===== DISCORD =====
    const payload = {
      embeds: [{
        title: "🧾 Pesanan Robux Baru",
        color: 5763719,
        fields: [
          { name: "Order ID", value: order.orderId },
          { name: "Username", value: order.username },
          { name: "Robux", value: order.amount.toString(), inline: true },
          { name: "Total", value: order.price },
          { name: "Delivery", value: order.deliveryType }
        ],
        timestamp: new Date()
      }]
    };

    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  });

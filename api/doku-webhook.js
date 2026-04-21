export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const payload = req.body;
  const { invoice_number, transaction_status } = payload;
  
  // Update status di Firestore
  const admin = require('firebase-admin');
  // Initialize Firebase Admin SDK...
  
  await admin.firestore().collection('orders').doc(invoice_number).update({
    status: transaction_status === 'SUCCESS' ? 'paid' : 'waiting_payment',
    paymentWebhook: payload,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  res.status(200).json({ status: 'ok' });
}
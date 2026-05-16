// File: api/user/update-balance.js
const processTransaction = require('./process-transaction');

module.exports = async (req, res) => {
  // Untuk topup, amount adalah nominal Rupiah (total pembayaran)
  // robuxAmount adalah jumlah Robux
  req.body.transactionType = 'topup';
  return processTransaction(req, res);
};
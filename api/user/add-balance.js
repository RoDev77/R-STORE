// File: api/user/add-balance.js
const processTransaction = require('./process-transaction');

module.exports = async (req, res) => {
  // Untuk deposit, amount adalah nominal Rupiah
  req.body.transactionType = 'deposit';
  req.body.robuxAmount = 0;
  return processTransaction(req, res);
};
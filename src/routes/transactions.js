const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

//Add Transaction
router.post('/', auth, (req, res) => {
  const { client_id, type, amount, remark, transaction_date } = req.body;

  if (!client_id || !type || !amount || !transaction_date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  console.log('TRANSACTION BODY:', req.body);

  db.query(
    `INSERT INTO transactions 
     (user_id, client_id, type, amount, remark, transaction_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.userId, client_id, type, amount, remark || null, transaction_date],
    (err, result) => {
      if (err) {
        console.error('❌ TRANSACTION INSERT ERROR:', err);
        return res.status(500).json({ message: 'Failed to save transaction' });
      }

      res.json({
        message: 'Transaction saved',
        transactionId: result.insertId,
      });
    }
  );
});



//edit transaction
router.put('/:id', auth, (req, res) => {
  db.query(
    `UPDATE transactions SET type=?,amount=?,remark=? WHERE id=? AND user_id=?`,
    [req.body.type, req.body.amount, req.body.remark, req.params.id, req.userId],
    () => res.json({ message: 'Updated' })
  );
});


///delete transaction
router.delete('/:id', auth, (req, res) => {
  db.query(
    'DELETE FROM transactions WHERE id=? AND user_id=?',
    [req.params.id, req.userId],
    () => res.json({ message: 'Deleted' })
  );
});

module.exports = router;

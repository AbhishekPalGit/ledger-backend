const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/* ================= DASHBOARD ================= */
router.get('/dashboard', auth, (req, res) => {
  const date = req.query.date;

  db.query(
    `SELECT
      SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) credit,
      SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) debit
     FROM transactions
     WHERE user_id=? AND transaction_date=?`,
    [req.userId, date],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });

      res.json({
        credit: rows[0].credit || 0,
        debit: rows[0].debit || 0,
        net: (rows[0].credit || 0) - (rows[0].debit || 0)
      });
    }
  );
});

/* ================= BALANCE SHEET ================= */
router.get('/balance-sheet', auth, (req, res) => {
  const date = req.query.date;

  db.query(
    `SELECT 
      c.name AS client,
      SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END) credit,
      SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END) debit,
      SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END) -
      SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END) balance
     FROM transactions t
     JOIN clients c ON c.id = t.client_id
     WHERE t.user_id=? AND t.transaction_date=?
     GROUP BY c.name`,
    [req.userId, date],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    }
  );
});

/* ================= CREDIT REPORT ================= */
router.get('/credit', auth, (req, res) => {
  const date = req.query.date;

  db.query(
    `SELECT 
      t.id,
      c.name AS client,
      t.amount,
      t.remark
     FROM transactions t
     JOIN clients c ON c.id = t.client_id
     WHERE t.user_id=? 
       AND t.type='credit'
       AND t.transaction_date=?`,
    [req.userId, date],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    }
  );
});

/* ================= DEBIT REPORT ================= */
router.get('/debit', auth, (req, res) => {
  const date = req.query.date;

  db.query(
    `SELECT 
      t.id,
      c.name AS client,
      t.amount,
      t.remark
     FROM transactions t
     JOIN clients c ON c.id = t.client_id
     WHERE t.user_id=? 
       AND t.type='debit'
       AND t.transaction_date=?`,
    [req.userId, date],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    }
  );
});


// UPDATE TRANSACTION
router.put('/transaction/:id', auth, (req, res) => {
  const { id } = req.params;
  const { amount, remark } = req.body;

  db.query(
    `UPDATE transactions 
     SET amount=?, remark=?
     WHERE id=? AND user_id=?`,
    [amount, remark, id, req.userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      if (!result.affectedRows)
        return res.status(404).json({ message: 'Transaction not found' });

      res.json({ message: 'Transaction updated' });
    }
  );
});


// DELETE TRANSACTION
router.delete('/transaction/:id', auth, (req, res) => {
  const { id } = req.params;

  db.query(
    `DELETE FROM transactions 
     WHERE id = ? AND user_id = ?`,
    [id, req.userId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'DB error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      res.json({ message: 'Transaction deleted' });
    }
  );
});


module.exports = router;

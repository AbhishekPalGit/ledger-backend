const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/* ================= DASHBOARD ================= */
router.get('/dashboard', auth, (req, res) => {
  const date = req.query.date;

  db.query(
    `SELECT
      ROUND(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 4) AS credit,
      ROUND(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 4) AS debit,
      ROUND(
        SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) -
        SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),
        4
      ) AS net
     FROM transactions
     WHERE user_id=? AND transaction_date=?`,
    [req.userId, date],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });

      res.json({
        credit: rows[0].credit || 0,
        debit: rows[0].debit || 0,
        net: rows[0].net || 0,
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

      ROUND(
        SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END),
        4
      ) AS credit,

      ROUND(
        SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END),
        4
      ) AS debit,

      ROUND(
        SUM(CASE WHEN t.type='credit' THEN t.amount ELSE 0 END) -
        SUM(CASE WHEN t.type='debit' THEN t.amount ELSE 0 END),
        4
      ) AS balance

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

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  db.query(
    `SELECT 
      t.id,
      c.name AS client,
      t.amount,
      t.remark,
      t.type,
      t.transaction_date
     FROM transactions t
     JOIN clients c ON c.id = t.client_id
     WHERE t.user_id = ?
       AND t.type = 'credit'
       AND DATE(t.transaction_date) = ?`,
    [req.userId, date],
    (err, rows) => {
      if (err) {
        console.error('CREDIT DB ERROR:', err);
        return res.status(500).json({ message: 'DB error' });
      }
      res.json(rows);
    }
  );
});


/* ================= DEBIT REPORT ================= */
router.get('/debit', auth, (req, res) => {
  const date = req.query.date;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  db.query(
    `SELECT 
        t.id,
        c.name AS client,
        t.amount,
        t.remark,
        t.transaction_date,
        t.type
     FROM transactions t
     JOIN clients c ON c.id = t.client_id
     WHERE t.user_id = ?
       AND t.type = 'debit'
       AND t.transaction_date = ?
     ORDER BY t.id DESC`,
    [req.userId, date],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }
      res.json(rows);
    }
  );
});

//edit transaction
router.put('/transaction/:id', auth, (req, res) => {
  const { type, amount, remark } = req.body;

  db.query(
    `UPDATE transactions 
     SET type=?, amount=?, remark=? 
     WHERE id=? AND user_id=?`,
    [type, amount, remark, req.params.id, req.userId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      res.json({ message: 'Updated Successfully' });
    }
  );
});

//delete transaction
router.delete('/transaction/:id', auth, (req, res) => {
  db.query(
    'DELETE FROM transactions WHERE id=? AND user_id=?',
    [req.params.id, req.userId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      res.json({ message: 'Deleted Successfully' });
    }
  );
});




module.exports = router;

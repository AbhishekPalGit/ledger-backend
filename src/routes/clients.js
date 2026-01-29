const express = require('express');
const db = require('../db');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', auth, (req, res) => {
  db.query(
    'SELECT * FROM clients WHERE user_id=?',
    [req.userId],
    (_, data) => res.json(data)
  );
});

router.post('/', auth, (req, res) => {
  db.query(
    'INSERT INTO clients (user_id,name) VALUES (?,?)',
    [req.userId, req.body.name],
    () => res.json({ message: 'Client added' })
  );
});

router.get('/:id/summary', auth, (req, res) => {
  const clientId = req.params.id;
  const userId = req.userId;

  const date =
    req.query.date || new Date().toISOString().slice(0, 10);

  const summarySql = `
    SELECT
      ROUND(
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount END), 0),
        4
      ) AS totalCredit,
      ROUND(
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount END), 0),
        4
      ) AS totalDebit
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
  `;

  const creditSql = `
    SELECT id, remark, amount, transaction_date
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
      AND type = 'credit'
    ORDER BY id DESC
  `;

  const debitSql = `
    SELECT id, remark, amount, transaction_date
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
      AND type = 'debit'
    ORDER BY id DESC
  `;

  db.query(summarySql, [clientId, userId, date], (err, summary) => {
    if (err) {
      console.error('Summary error:', err);
      return res
        .status(500)
        .json({ message: 'Failed to load client summary' });
    }

    db.query(creditSql, [clientId, userId, date], (err, credits) => {
      if (err) {
        console.error('Credit error:', err);
        return res
          .status(500)
          .json({ message: 'Failed to load credit records' });
      }

      db.query(debitSql, [clientId, userId, date], (err, debits) => {
        if (err) {
          console.error('Debit error:', err);
          return res
            .status(500)
            .json({ message: 'Failed to load debit records' });
        }

        res.json({
          totalCredit: Number(summary[0].totalCredit),
          totalDebit: Number(summary[0].totalDebit),
          credits,
          debits,
        });
      });
    });
  });
});



module.exports = router;

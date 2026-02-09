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
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  /* ================= OPENING BALANCE ================= */
  const openingSql = `
    SELECT
      TRUNCATE(
        TRUNCATE(COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0), 3)
        -
        TRUNCATE(COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 0), 3),
      3
      ) AS openingBalance
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date < ?
  `;

  /* ================= DAILY TOTAL ================= */
  const summarySql = `
    SELECT
      TRUNCATE(COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END), 0), 3) AS totalCredit,
      TRUNCATE(COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END), 0), 3) AS totalDebit
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
  `;

  /* ================= CREDIT LIST ================= */
  const creditSql = `
    SELECT
      id,
      remark,
      TRUNCATE(amount, 3) AS amount,
      transaction_date
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
      AND type = 'credit'
    ORDER BY id DESC
  `;

  /* ================= DEBIT LIST ================= */
  const debitSql = `
    SELECT
      id,
      remark,
      TRUNCATE(amount, 3) AS amount,
      transaction_date
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
      AND type = 'debit'
    ORDER BY id DESC
  `;

  db.query(openingSql, [clientId, userId, date], (err, opening) => {
    if (err) return res.status(500).json({ message: 'Opening failed' });

    db.query(summarySql, [clientId, userId, date], (err, summary) => {
      if (err) return res.status(500).json({ message: 'Summary failed' });

      db.query(creditSql, [clientId, userId, date], (err, credits) => {
        if (err) return res.status(500).json({ message: 'Credits failed' });

        db.query(debitSql, [clientId, userId, date], (err, debits) => {
          if (err) return res.status(500).json({ message: 'Debits failed' });

          res.json({
            openingBalance: Number(opening[0].openingBalance),
            totalCredit: Number(summary[0].totalCredit),
            totalDebit: Number(summary[0].totalDebit),
            credits,
            debits,
          });
        });
      });
    });
  });
});



module.exports = router;

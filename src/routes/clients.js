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

  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount END), 0) AS totalCredit,
      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount END), 0) AS totalDebit
    FROM transactions
    WHERE client_id = ?
      AND user_id = ?
      AND transaction_date = ?
  `;

  db.query(sql, [clientId, userId, date], (err, data) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: 'Failed to load client summary' });
    }

    res.json({
      totalCredit: data[0].totalCredit,
      totalDebit: data[0].totalDebit,
    });
  });
});


module.exports = router;

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

module.exports = router;

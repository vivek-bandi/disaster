// routes/alerts.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { Alert } = require('../config/mongo');

router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, severity, type } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: alerts });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to fetch alerts' }); }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const alert = await Alert.create({ ...req.body, created_by: req.user.id });
    const io = req.app.get('io');
    io.emit('new-alert', alert);
    res.status(201).json({ success: true, data: alert });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to create alert' }); }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, { $addToSet: { read_by: req.user.id }, is_read: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
});

module.exports = router;

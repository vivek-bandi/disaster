const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const incidentController = require('../controllers/incidentController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || './uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', optionalAuth, incidentController.getAllIncidents);
router.get('/stats', authenticate, incidentController.getIncidentStats);
router.get('/:id', optionalAuth, incidentController.getIncidentById);
router.post('/', authenticate, upload.array('images', 5), incidentController.createIncident);
router.put('/:id', authenticate, authorize('volunteer', 'admin'), incidentController.updateIncident);
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { pool } = require('../config/postgres');
  await pool.query('DELETE FROM incidents WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Incident deleted' });
});

module.exports = router;

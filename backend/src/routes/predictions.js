const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const predictionController = require('../controllers/predictionController');

router.get('/', optionalAuth, predictionController.getPredictions);
router.get('/risk-map', optionalAuth, predictionController.getRiskMap);
router.get('/analytics', authenticate, predictionController.getAnalytics);
router.post('/', authenticate, authorize('admin', 'volunteer'), predictionController.createPrediction);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, uploadAsset } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/:id', getSettings);
router.put('/:id', protect, authorize('Super Admin'), updateSettings);
router.post('/upload/:type', protect, authorize('Super Admin'), upload.single('file'), uploadAsset);

module.exports = router;

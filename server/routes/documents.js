const express = require('express');
const router = express.Router();
const {
    getDocuments,
    getDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    getMyDocuments,
    getPendingApprovals,
    uploadRevision
} = require('../controllers/documentsController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { invalidateCacheMiddleware } = require('../middleware/cache');


// Cache invalidation patterns
const cachePatterns = [/\/api\/documents/, /\/api\/dashboard/];

router.route('/')
    .get(protect, getDocuments)
    .post(protect, authorize('Editor', 'Approver', 'Super Admin'), upload.single('file'), invalidateCacheMiddleware(cachePatterns), uploadDocument);

router.get('/my/uploads', protect, getMyDocuments);
router.get('/pending/approval', protect, authorize('Approver', 'Super Admin'), getPendingApprovals);

router.route('/:id')
    .get(protect, getDocument)
    .put(protect, invalidateCacheMiddleware(cachePatterns), updateDocument)
    .delete(protect, invalidateCacheMiddleware(cachePatterns), deleteDocument);

router.post('/:id/revision', protect, upload.single('file'), invalidateCacheMiddleware(cachePatterns), uploadRevision);

router.get('/:id/download', protect, downloadDocument);

module.exports = router;


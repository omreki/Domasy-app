const express = require('express');
const router = express.Router();
const { getUsers, updateUser, createUser, deleteUser, updateProfile, updateAvatar } = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/auth');
const { invalidateCacheMiddleware } = require('../middleware/cache');
const upload = require('../middleware/upload');

const cachePatterns = [/\/api\/users/, /\/api\/dashboard/];

router.route('/')
    .get(protect, authorize('Super Admin', 'Approver', 'Editor', 'Viewer'), getUsers)
    .post(protect, authorize('Super Admin'), invalidateCacheMiddleware(cachePatterns), createUser);

router.put('/profile', protect, invalidateCacheMiddleware(cachePatterns), updateProfile);
router.post('/avatar', protect, upload.single('avatar'), invalidateCacheMiddleware(cachePatterns), updateAvatar);

router.route('/:id')
    .put(protect, authorize('Super Admin'), invalidateCacheMiddleware(cachePatterns), updateUser)
    .delete(protect, authorize('Super Admin'), invalidateCacheMiddleware(cachePatterns), deleteUser);

module.exports = router;

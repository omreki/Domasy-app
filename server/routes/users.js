const express = require('express');
const router = express.Router();
const { getUsers, updateUser, createUser, deleteUser } = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/auth');
const { invalidateCacheMiddleware } = require('../middleware/cache');

const cachePatterns = [/\/api\/users/, /\/api\/dashboard/];

router.route('/')
    .get(protect, authorize('Super Admin', 'Approver', 'Editor', 'Viewer'), getUsers)
    .post(protect, authorize('Super Admin'), invalidateCacheMiddleware(cachePatterns), createUser);

router.route('/:id')
    .put(protect, authorize('Super Admin'), invalidateCacheMiddleware(cachePatterns), updateUser)
    .delete(protect, authorize('Super Admin'), invalidateCacheMiddleware(cachePatterns), deleteUser);

module.exports = router;

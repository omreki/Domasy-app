const express = require('express');
const router = express.Router();
const { getProjects, createProject, getProject, updateProject, deleteProject } = require('../controllers/projectsController');
const { protect, authorize } = require('../middleware/auth');
const { invalidateCacheMiddleware } = require('../middleware/cache');

const cachePatterns = [/\/api\/projects/, /\/api\/dashboard/];

router.route('/')
    .get(protect, getProjects)
    .post(protect, authorize('Editor', 'Approver', 'Super Admin'), invalidateCacheMiddleware(cachePatterns), createProject);

router.route('/:id')
    .get(protect, getProject)
    .put(protect, invalidateCacheMiddleware(cachePatterns), updateProject)
    .delete(protect, invalidateCacheMiddleware(cachePatterns), deleteProject);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    logout,
    updatePassword,
    updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatepassword', protect, updatePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;

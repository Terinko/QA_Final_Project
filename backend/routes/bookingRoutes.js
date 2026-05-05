const express = require('express');
const router = express.Router();
const { createBooking, cancelBooking, markAttendance, getBookings } = require('../controllers/bookingController');
const { authenticateToken, isStaff } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getBookings);
router.post('/', authenticateToken, createBooking);
router.delete('/:id', authenticateToken, cancelBooking);
router.patch('/:id/attend', authenticateToken, isStaff, markAttendance);

module.exports = router;

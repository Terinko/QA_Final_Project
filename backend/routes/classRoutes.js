const express = require('express');
const router = express.Router();
const { getAllClasses, getClassById, createClass, updateClass, deleteClass } = require('../controllers/classController');
const { authenticateToken, isStaff } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getAllClasses);
router.get('/:id', authenticateToken, getClassById);
router.post('/', authenticateToken, isStaff, createClass);
router.put('/:id', authenticateToken, isStaff, updateClass);
router.delete('/:id', authenticateToken, isStaff, deleteClass);

module.exports = router;

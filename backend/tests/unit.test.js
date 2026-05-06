const { authenticateToken, isStaff, isMember } = require('../middleware/authMiddleware');
const { register } = require('../controllers/authController');
const { createClass } = require('../controllers/classController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('../db', () => ({
  prepare: jest.fn()
}));

describe('Unit Tests - Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    test('should return 401 if no token is provided', () => {
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    });

    test('should return 403 if token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalid-token';
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid'), null);
      });

      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    test('should call next and set req.user if token is valid', () => {
      req.headers['authorization'] = 'Bearer valid-token';
      const mockUser = { id: 1, role: 'Member' };
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockUser);
      });

      authenticateToken(req, res, next);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('isStaff', () => {
    test('should call next if user role is Staff', () => {
      req.user = { role: 'Staff' };
      isStaff(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user role is not Staff', () => {
      req.user = { role: 'Member' };
      isStaff(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Staff access required' });
    });
  });

  describe('isMember', () => {
    test('should call next if user role is Member', () => {
      req.user = { role: 'Member' };
      isMember(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('should return 403 if user role is not Member', () => {
      req.user = { role: 'Staff' };
      isMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Member access required' });
    });
  });
});

describe('Unit Tests - Controllers', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should return 400 if fields are missing', () => {
      req.body = { name: 'Test' }; // missing email, password, role
      register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    test('should return 400 if role is invalid', () => {
      req.body = { name: 'Test', email: 't@t.com', password: 'p', role: 'Admin' };
      register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });
  });

  describe('createClass', () => {
    test('should return 400 if fields are missing', () => {
      req.body = { title: 'Yoga' }; // missing instructorName, dateTime, capacity
      createClass(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    test('should return 400 if capacity is negative', () => {
      req.body = { title: 'Yoga', instructorName: 'John', dateTime: '2026-05-06', capacity: -1 };
      createClass(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Capacity must be positive' });
    });

    test('should return 400 if date is in the past', () => {
      req.body = { title: 'Yoga', instructorName: 'John', dateTime: '2020-01-01', capacity: 10 };
      createClass(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Date must be in the future' });
    });
  });
});

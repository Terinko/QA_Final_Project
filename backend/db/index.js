const Database = require('better-sqlite3');
const path = require('path');

const dbName = process.env.NODE_ENV === 'test' ? 'gym.test.db' : 'gym.db';
const dbPath = path.join(__dirname, dbName);
const db = new Database(dbPath);

module.exports = db;

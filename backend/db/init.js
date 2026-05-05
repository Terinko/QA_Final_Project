const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gym.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('Member', 'Staff')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    instructorName TEXT NOT NULL,
    dateTime TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity >= 0)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memberId INTEGER NOT NULL,
    classId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Booked', 'Cancelled', 'Attended')) NOT NULL DEFAULT 'Booked',
    FOREIGN KEY (memberId) REFERENCES users(id),
    FOREIGN KEY (classId) REFERENCES classes(id)
  );
`);

console.log('Database initialized.');
db.close();

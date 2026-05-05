const bcrypt = require('bcryptjs');
const db = require('./index');

const seed = () => {
  try {
    // Clear existing data (optional, depends on if we want to add or replace)
    db.exec(`
      DELETE FROM bookings;
      DELETE FROM classes;
      DELETE FROM users;
    `);

    // Create users
    const password = bcrypt.hashSync('password', 10);
    const users = [
      ['John Staff', 'staff@gym.com', password, 'Staff'],
      ['Sarah Staff', 'sarah@gym.com', password, 'Staff'],
      ['Alice Member', 'alice@gmail.com', password, 'Member'],
      ['Bob Member', 'bob@gmail.com', password, 'Member'],
      ['Charlie Member', 'charlie@gmail.com', password, 'Member'],
    ];

    const userStmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    users.forEach(u => userStmt.run(...u));

    // Create classes
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
    const past = new Date(now); past.setDate(past.getDate() - 2);

    const classes = [
      ['Morning Yoga', 'Gentle flow for all levels.', 'Sarah Smith', tomorrow.toISOString(), 15],
      ['High Intensity HIIT', 'Push your limits with this intense cardio session.', 'Mike Power', dayAfter.toISOString(), 10],
      ['Spin Revolution', 'High energy indoor cycling.', 'Elena Fast', nextWeek.toISOString(), 20],
      ['Strength Basics', 'Learn the foundations of lifting.', 'John Strong', tomorrow.toISOString(), 8],
      ['Past Pilates', 'Focus on core strength.', 'Alice Core', past.toISOString(), 12],
    ];

    const classStmt = db.prepare('INSERT INTO classes (title, description, instructorName, dateTime, capacity) VALUES (?, ?, ?, ?, ?)');
    classes.forEach(c => classStmt.run(...c));

    // Create some initial bookings
    const alice = db.prepare('SELECT id FROM users WHERE email = ?').get('alice@gmail.com');
    const bob = db.prepare('SELECT id FROM users WHERE email = ?').get('bob@gmail.com');
    const yoga = db.prepare('SELECT id FROM classes WHERE title = ?').get('Morning Yoga');
    const hiit = db.prepare('SELECT id FROM classes WHERE title = ?').get('High Intensity HIIT');
    const pastClass = db.prepare('SELECT id FROM classes WHERE title = ?').get('Past Pilates');

    const bookingStmt = db.prepare('INSERT INTO bookings (memberId, classId, status) VALUES (?, ?, ?)');
    bookingStmt.run(alice.id, yoga.id, 'Booked');
    bookingStmt.run(bob.id, yoga.id, 'Booked');
    bookingStmt.run(alice.id, hiit.id, 'Booked');
    bookingStmt.run(bob.id, pastClass.id, 'Attended');

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    db.close();
  }
};

seed();

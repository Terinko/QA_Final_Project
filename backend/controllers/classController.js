const db = require('../db');

const getAllClasses = (req, res) => {
  try {
    const classes = db.prepare(`
      SELECT c.*, 
      (SELECT COUNT(*) FROM bookings b WHERE b.classId = c.id AND b.status = 'Booked') as activeBookings
      FROM classes c
    `).all();
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getClassById = (req, res) => {
  try {
    const { id } = req.params;
    const gymClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });
    res.json(gymClass);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createClass = (req, res) => {
  const { title, description, instructorName, dateTime, capacity } = req.body;

  if (!title || !instructorName || !dateTime || capacity === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (capacity < 0) return res.status(400).json({ error: 'Capacity must be positive' });
  if (new Date(dateTime) < new Date()) return res.status(400).json({ error: 'Date must be in the future' });

  try {
    const stmt = db.prepare('INSERT INTO classes (title, description, instructorName, dateTime, capacity) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(title, description, instructorName, dateTime, capacity);
    res.status(201).json({ id: info.lastInsertRowid, title, description, instructorName, dateTime, capacity });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateClass = (req, res) => {
  const { id } = req.params;
  const { title, description, instructorName, dateTime, capacity } = req.body;

  try {
    const gymClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });

    const stmt = db.prepare(`
      UPDATE classes 
      SET title = ?, description = ?, instructorName = ?, dateTime = ?, capacity = ?
      WHERE id = ?
    `);
    stmt.run(
      title || gymClass.title,
      description !== undefined ? description : gymClass.description,
      instructorName || gymClass.instructorName,
      dateTime || gymClass.dateTime,
      capacity !== undefined ? capacity : gymClass.capacity,
      id
    );
    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteClass = (req, res) => {
  const { id } = req.params;
  const { force } = req.query;

  try {
    const bookings = db.prepare("SELECT count(*) as count FROM bookings WHERE classId = ? AND status = 'Booked'").get(id);
    
    if (bookings.count > 0 && force !== 'true') {
      return res.status(400).json({ error: 'Class has active bookings. Use force=true to override.' });
    }

    // If force is true, we might want to cancel all bookings first or just delete them (FK constraint might fail if not CASCADE)
    // The current schema doesn't have CASCADE. Let's delete bookings if forced.
    if (force === 'true') {
      db.prepare('DELETE FROM bookings WHERE classId = ?').run(id);
    }

    const info = db.prepare('DELETE FROM classes WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Class not found' });
    
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllClasses, getClassById, createClass, updateClass, deleteClass };

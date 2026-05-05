const db = require('../db');

const createBooking = (req, res) => {
  const { classId, memberId: providedMemberId } = req.body;
  const memberId = req.user.role === 'Staff' ? (providedMemberId || req.user.id) : req.user.id;

  if (!classId) return res.status(400).json({ error: 'Class ID is required' });

  try {
    const gymClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
    if (!gymClass) return res.status(404).json({ error: 'Class not found' });

    // Business Rule: Past classes cannot be booked by Members
    if (req.user.role === 'Member' && new Date(gymClass.dateTime) < new Date()) {
      return res.status(400).json({ error: 'Cannot book past classes' });
    }

    // Business Rule: Member cannot book the same class twice (active booking)
    const existingBooking = db.prepare("SELECT * FROM bookings WHERE memberId = ? AND classId = ? AND status = 'Booked'").get(memberId, classId);
    if (existingBooking) return res.status(400).json({ error: 'Member already has an active booking for this class' });

    // Concurrency & Capacity check
    const transaction = db.transaction(() => {
      // Business Rule: Count only active ('Booked') bookings towards capacity
      const activeBookings = db.prepare("SELECT count(*) as count FROM bookings WHERE classId = ? AND status = 'Booked'").get(classId);
      
      // Business Rule: Member cannot book if full, unless Staff override
      if (req.user.role === 'Member' && activeBookings.count >= gymClass.capacity) {
        throw new Error('CAPACITY_FULL');
      }

      const stmt = db.prepare('INSERT INTO bookings (memberId, classId, status) VALUES (?, ?, ?)');
      const info = stmt.run(memberId, classId, 'Booked');
      return info.lastInsertRowid;
    });

    try {
      const bookingId = transaction();
      res.status(201).json({ id: bookingId, memberId, classId, status: 'Booked' });
    } catch (e) {
      if (e.message === 'CAPACITY_FULL') {
        return res.status(400).json({ error: 'Class is full' });
      }
      throw e;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cancelBooking = (req, res) => {
  const { id } = req.params;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Business Rule: Member can only cancel their own bookings
    if (req.user.role === 'Member' && booking.memberId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
    }

    // Business Rule: Past classes cannot be cancelled by Members (optional, but good for consistency)
    const gymClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(booking.classId);
    if (req.user.role === 'Member' && new Date(gymClass.dateTime) < new Date()) {
        return res.status(400).json({ error: 'Cannot cancel bookings for past classes' });
    }

    db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
    res.json({ message: 'Booking removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const markAttendance = (req, res) => {
  const { id } = req.params;

  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'Booked') return res.status(400).json({ error: 'Only Booked sessions can be marked as Attended' });

    db.prepare("UPDATE bookings SET status = 'Attended' WHERE id = ?").run(id);
    res.json({ message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBookings = (req, res) => {
  const { classId } = req.query;

  try {
    let bookings;
    if (req.user.role === 'Staff') {
      if (classId) {
        bookings = db.prepare('SELECT b.*, u.name as memberName FROM bookings b JOIN users u ON b.memberId = u.id WHERE b.classId = ?').all(classId);
      } else {
        bookings = db.prepare('SELECT b.*, u.name as memberName, c.title as classTitle FROM bookings b JOIN users u ON b.memberId = u.id JOIN classes c ON b.classId = c.id').all();
      }
    } else {
      // Member can only see their own
      bookings = db.prepare('SELECT b.*, c.title as classTitle, c.dateTime FROM bookings b JOIN classes c ON b.classId = c.id WHERE b.memberId = ?').all(req.user.id);
    }
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createBooking, cancelBooking, markAttendance, getBookings };

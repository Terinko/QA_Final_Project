import { useState, useEffect } from 'react';

const StaffDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [newClass, setNewClass] = useState({ title: '', description: '', instructorName: '', dateTime: '', capacity: 10 });
  const [selectedClassId, setSelectedClassId] = useState(null);
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchClasses();
    fetchBookings();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('http://localhost:5000/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setClasses(data);
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const fetchBookings = async (classId = null) => {
    try {
      const url = classId ? `http://localhost:5000/bookings?classId=${classId}` : 'http://localhost:5000/bookings';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setBookings(data);
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  const createClass = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newClass)
      });
      if (response.ok) {
        fetchClasses();
        setNewClass({ title: '', description: '', instructorName: '', dateTime: '', capacity: 10 });
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create class');
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Are you sure? This will fail if there are active bookings unless you use override.')) return;
    try {
      let response = await fetch(`http://localhost:5000/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        if (data.error.includes('active bookings')) {
          if (window.confirm('Class has active bookings. Force delete and cancel all bookings?')) {
            response = await fetch(`http://localhost:5000/classes/${id}?force=true`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          }
        }
      }
      if (response.ok) fetchClasses();
    } catch (err) {
      setError('Failed to delete class');
    }
  };

  const markAttendance = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:5000/bookings/${bookingId}/attend`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchBookings(selectedClassId);
      }
    } catch (err) {
      setError('Failed to mark attendance');
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:5000/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchBookings(selectedClassId);
      }
    } catch (err) {
      setError('Failed to cancel booking');
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Staff Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user.name}. Manage your schedule and members here.</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section>
        <h2>Schedule New Class</h2>
        <form onSubmit={createClass} className="inline-form">
          <div className="form-group">
            <label>Class Title</label>
            <input type="text" placeholder="e.g. Power Yoga" value={newClass.title} onChange={e => setNewClass({...newClass, title: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Instructor Name</label>
            <input type="text" placeholder="e.g. Sarah Smith" value={newClass.instructorName} onChange={e => setNewClass({...newClass, instructorName: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Date & Time</label>
            <input type="datetime-local" value={newClass.dateTime} onChange={e => setNewClass({...newClass, dateTime: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Capacity</label>
            <input type="number" placeholder="20" value={newClass.capacity} onChange={e => setNewClass({...newClass, capacity: parseInt(e.target.value)})} required />
          </div>
          <div className="form-group full-width">
            <label>Description</label>
            <textarea placeholder="Tell members what to expect..." value={newClass.description} onChange={e => setNewClass({...newClass, description: e.target.value})} rows="3"></textarea>
          </div>
          <div className="full-width">
            <button type="submit" className="btn btn-primary">Publish Class</button>
          </div>
        </form>
      </section>

      <section>
        <h2>Active Classes</h2>
        <div className="grid">
          {classes.map(c => (
            <div key={c.id} className={`card ${selectedClassId === c.id ? 'selected' : ''}`} style={{ borderColor: selectedClassId === c.id ? 'var(--primary-color)' : '#f1f5f9' }}>
              <h3>{c.title}</h3>
              <p>👤 {c.instructorName}</p>
              <p>📅 {new Date(c.dateTime).toLocaleString()}</p>
              <p>Capacity: {c.capacity}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setSelectedClassId(c.id); fetchBookings(c.id); }}>Manage</button>
                <button className="btn btn-danger" onClick={() => deleteClass(c.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedClassId && (
        <section>
          <h2>Attendance: Class ID #{selectedClassId}</h2>
          <div className="table-container">
            <table className="booking-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.filter(b => b.classId === selectedClassId).map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.memberName}</td>
                    <td><span className={`status-badge status-${b.status.toLowerCase()}`}>{b.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {b.status === 'Booked' && (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }} onClick={() => markAttendance(b.id)}>Check-in</button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem' }} onClick={() => cancelBooking(b.id)}>Void</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.filter(b => b.classId === selectedClassId).length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No bookings for this class yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default StaffDashboard;

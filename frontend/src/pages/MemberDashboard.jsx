import { useState, useEffect } from 'react';

const MemberDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
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

  const fetchBookings = async () => {
    try {
      const response = await fetch('http://localhost:5000/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setBookings(data);
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  const bookClass = async (classId) => {
    setError('');
    try {
      const response = await fetch('http://localhost:5000/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ classId })
      });
      const data = await response.json();
      if (response.ok) {
        fetchBookings();
        fetchClasses(); // Refresh to potentially show updated capacity (though capacity isn't shown in detail yet)
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Booking failed');
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:5000/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchBookings();
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Cancellation failed');
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem' }}>
        <h1>Hello, {user.name}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Ready for your next workout?</p>
      </header>

      {error && <div className="error-banner">{error}</div>}
      
      <section>
        <h2>Explore Classes</h2>
        <div className="grid">
          {classes.map(c => (
            <div key={c.id} className="card">
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <div className="card-meta">
                <span>👤 {c.instructorName}</span>
                <span>📅 {new Date(c.dateTime).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Spots: {c.capacity - c.activeBookings} / {c.capacity} left
                </span>
                <button 
                  className="btn btn-primary"
                  onClick={() => bookClass(c.id)}
                  disabled={new Date(c.dateTime) < new Date() || (c.capacity - c.activeBookings <= 0)}
                >
                  {new Date(c.dateTime) < new Date() ? 'Finished' : (c.capacity - c.activeBookings <= 0 ? 'Full' : 'Book Spot')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Your Reservations</h2>
        <div className="grid">
          {bookings.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No bookings yet.</p>}
          {bookings.map(b => (
            <div key={b.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h3>{b.classTitle}</h3>
                <span className={`status-badge status-${b.status.toLowerCase()}`}>{b.status}</span>
              </div>
              <p>📅 {new Date(b.dateTime).toLocaleString()}</p>
              {b.status === 'Booked' && (
                <button 
                  className="btn btn-danger" 
                  style={{ marginTop: '1rem', width: '100%' }}
                  onClick={() => cancelBooking(b.id)}
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MemberDashboard;

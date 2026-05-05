const request = require('supertest');
const app = require('../index');
const setup = require('./setup');
const db = require('../db');

beforeEach(() => {
  setup();
});

describe('Gym Class Booking API', () => {
  let memberToken, staffToken, memberId, staffId, classId;

  beforeEach(async () => {
    // Register and login a member
    await request(app).post('/auth/register').send({
      name: 'Member User',
      email: 'member@test.com',
      password: 'password',
      role: 'Member'
    });
    const memberLogin = await request(app).post('/auth/login').send({
      email: 'member@test.com',
      password: 'password'
    });
    memberToken = memberLogin.body.token;
    memberId = memberLogin.body.user.id;

    // Register and login a staff
    await request(app).post('/auth/register').send({
      name: 'Staff User',
      email: 'staff@test.com',
      password: 'password',
      role: 'Staff'
    });
    const staffLogin = await request(app).post('/auth/login').send({
      email: 'staff@test.com',
      password: 'password'
    });
    staffToken = staffLogin.body.token;
    staffId = staffLogin.body.user.id;

    // Create a class
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newClass = await request(app)
      .post('/classes')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Yoga',
        instructorName: 'John Doe',
        dateTime: tomorrow.toISOString(),
        capacity: 1
      });
    classId = newClass.body.id;
  });

  test('Member can book a class', async () => {
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });
    expect(res.statusCode).toEqual(201);
    expect(res.body.status).toEqual('Booked');
  });

  test('Member cannot book a full class', async () => {
    // First booking
    await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });

    // Second booking (different user needed or same user if we test double booking)
    // Double booking test first
    const resDouble = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });
    expect(resDouble.statusCode).toEqual(400);
    expect(resDouble.body.error).toContain('already has an active booking');

    // Full capacity test
    // Register another member
    await request(app).post('/auth/register').send({
      name: 'Member 2',
      email: 'member2@test.com',
      password: 'password',
      role: 'Member'
    });
    const member2Login = await request(app).post('/auth/login').send({
      email: 'member2@test.com',
      password: 'password'
    });
    const member2Token = member2Login.body.token;

    const resFull = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({ classId });
    expect(resFull.statusCode).toEqual(400);
    expect(resFull.body.error).toEqual('Class is full');
  });

  test('Staff can override capacity', async () => {
    // Fill the class
    await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });

    // Register another member for override
    await request(app).post('/auth/register').send({
      name: 'Override Member',
      email: 'override@test.com',
      password: 'password',
      role: 'Member'
    });
    const overrideMemberLogin = await request(app).post('/auth/login').send({
      email: 'override@test.com',
      password: 'password'
    });
    const overrideMemberId = overrideMemberLogin.body.user.id;

    // Staff adds another member
    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ classId, memberId: overrideMemberId });
    
    expect(res.statusCode).toEqual(201);
  });

  test('Member cannot delete a class', async () => {
    const res = await request(app)
      .delete(`/classes/${classId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.statusCode).toEqual(403);
  });

  test('Staff can mark attendance', async () => {
    const booking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });
    const bookingId = booking.body.id;

    const res = await request(app)
      .patch(`/bookings/${bookingId}/attend`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.statusCode).toEqual(200);

    const checkRes = await request(app)
      .get('/bookings')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(checkRes.body[0].status).toEqual('Attended');
  });

  test('Member cannot mark attendance', async () => {
      const booking = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ classId });
      const bookingId = booking.body.id;
  
      const res = await request(app)
        .patch(`/bookings/${bookingId}/attend`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.statusCode).toEqual(403);
  });

  test('Member can only cancel their own booking', async () => {
    // Member 1 books
    const booking1 = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });
    const booking1Id = booking1.body.id;

    // Register Member 2
    await request(app).post('/auth/register').send({
      name: 'Member 2',
      email: 'member2@test.com',
      password: 'password',
      role: 'Member'
    });
    const member2Login = await request(app).post('/auth/login').send({
      email: 'member2@test.com',
      password: 'password'
    });
    const member2Token = member2Login.body.token;

    // Member 2 tries to cancel Member 1's booking
    const res = await request(app)
      .delete(`/bookings/${booking1Id}`)
      .set('Authorization', `Bearer ${member2Token}`);
    expect(res.statusCode).toEqual(403);

    // Member 1 can cancel their own
    const resOwn = await request(app)
      .delete(`/bookings/${booking1Id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(resOwn.statusCode).toEqual(200);
  });

  test('Staff can cancel any booking', async () => {
    const booking = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });
    const bookingId = booking.body.id;

    const res = await request(app)
      .delete(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.statusCode).toEqual(200);
  });

  test('Staff cannot delete class with active bookings without force', async () => {
    await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });

    const res = await request(app)
      .delete(`/classes/${classId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('active bookings');

    const resForce = await request(app)
      .delete(`/classes/${classId}?force=true`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resForce.statusCode).toEqual(200);
  });

  test('Member cannot book past classes', async () => {
    // Create a past class (using raw DB access to set past date easily or via API if validation allows)
    // Actually our API prevents creating past classes. Let's try to book a class that was just created but we pretend it's past.
    // Better: Staff creates a class, then we wait? No, let's just use raw DB to update the date.
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    
    db.prepare('UPDATE classes SET dateTime = ? WHERE id = ?').run(pastDate.toISOString(), classId);

    const res = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ classId });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('Cannot book past classes');
  });
});

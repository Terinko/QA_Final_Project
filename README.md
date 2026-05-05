I have completed the implementation of the Gym Class Booking Platform. The application is a full-stack solution featuring a Node.js/Express backend and a
  React frontend.

  Key Implementation Details:

   1. Backend (Node.js/Express + SQLite):
       * Role-Based Access Control (RBAC): Enforced via JWT middleware, distinguishing between Member and Staff.
       * Business Rules:
           * Strict capacity limits with Staff override capability.
           * Prevention of double bookings and booking past classes.
           * Restricted state transitions: Booked → Cancelled (Member/Staff) or Attended (Staff only).
       * Data Integrity: Foreign key constraints and transaction-based capacity checks to prevent race conditions.
   2. Frontend (React + Vite):
       * Routing: Secure routing using react-router-dom and a ProtectedRoute component.
       * Member Dashboard: Allows members to browse classes, book available spots, and manage their reservations.
       * Staff Dashboard: Provides tools for class management (CRUD), viewing all bookings, and marking member attendance.
       * Styling: A clean, responsive UI built with Vanilla CSS.
   3. Testing & Validation:
       * Integration Tests: 10 comprehensive tests using Jest and Supertest verify all core business logic, including unauthorized access attempts, capacity
         constraints, and state management.
       * Test Isolation: A dedicated test database (gym.test.db) ensures tests do not interfere with production data.

  How to Run:

   1. Backend:
       * Navigate to the backend folder.
       * Run npm install (if not already done).
       * Run node db/init.js to initialize the database.
       * Run npm start (or npx nodemon index.js) to start the API server on http://localhost:5000.
   2. Frontend:
       * Navigate to the frontend folder.
       * Run npm install and npm run dev.
       * Access the application at http://localhost:5173.
   3. Tests:
       * In the backend folder, run $env:NODE_ENV='test'; npx jest tests/api.test.js --runInBand.

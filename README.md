# Employee Management Application

A beginner-friendly full-stack project: **React** frontend + **Node.js/Express** backend.

## What This App Does

- View all employees
- Add new employees
- Edit existing employees
- Delete employees

Data is stored in a JSON file (`backend/data/employees.json`) so you don't need to set up a database yet.

---

## Project Structure

```
employee-management-app/
├── backend/                 # Node.js API server
│   ├── server.js            # Starts the server
│   ├── routes/
│   │   └── employees.js     # API endpoints (GET, POST, PUT, DELETE)
│   └── data/
│       └── employees.json   # Employee data storage
│
└── frontend/                # React app
    ├── src/
    │   ├── main.jsx         # Entry point — mounts React to the page
    │   ├── App.jsx          # Main component — holds state & logic
    │   ├── api/
    │   │   └── employeeApi.js   # Functions that call the backend
    │   └── components/
    │       ├── EmployeeForm.jsx  # Add/Edit form
    │       ├── EmployeeList.jsx  # List wrapper
    │       └── EmployeeCard.jsx  # Single employee card
    └── index.html
```

---

## Prerequisites

Install these first:

1. **Node.js** (v18+) — [https://nodejs.org](https://nodejs.org)
2. A code editor — **VS Code** or **Cursor** recommended

Verify installation:

```bash
node --version
npm --version
```

---

## Step 1: Install Dependencies

Open **two terminals** (or use split terminal in Cursor).

### Terminal 1 — Backend

```bash
cd backend
npm install
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
```

---

## Step 2: Start the Backend

In the `backend` folder:

```bash
npm run dev
```

You should see: `Server running at http://localhost:5000`

Test it in your browser: [http://localhost:5000/api/employees](http://localhost:5000/api/employees)

You should see JSON data with sample employees.

---

## Step 3: Start the Frontend

In the `frontend` folder (new terminal):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How Frontend & Backend Talk

```
┌─────────────┐         HTTP requests          ┌─────────────┐
│   React     │  ──────────────────────────► │   Express   │
│  (port 3000)│  ◄──────────────────────────  │  (port 5000)│
└─────────────┘         JSON responses         └─────────────┘
                                                      │
                                                      ▼
                                              employees.json
```

| Action | Method | URL |
|--------|--------|-----|
| Get all | GET | `/api/employees` |
| Get one | GET | `/api/employees/:id` |
| Create | POST | `/api/employees` |
| Update | PUT | `/api/employees/:id` |
| Delete | DELETE | `/api/employees/:id` |

---

## Key Concepts for Beginners

### Node.js / Express (Backend)

- **`server.js`** — Creates an HTTP server and listens on port 5000.
- **`express.json()`** — Parses JSON from request bodies (needed for POST/PUT).
- **`cors`** — Allows the React app (different port) to call the API.
- **Routes** — Map URLs to functions. Example: `GET /api/employees` returns all employees.

### React (Frontend)

- **Components** — Reusable UI pieces (`EmployeeForm`, `EmployeeCard`, etc.).
- **`useState`** — Stores data that can change (employee list, form values, errors).
- **`useEffect`** — Runs code when the page loads (fetch employees from API).
- **Props** — Data passed from parent to child (`onEdit`, `employee`, etc.).
- **`fetch`** — Browser API to make HTTP requests to your backend.

### Data Flow Example (Adding an Employee)

1. User fills the form and clicks **Add**
2. `EmployeeForm` calls `onSubmit(formData)`
3. `App.jsx` calls `createEmployee()` from `employeeApi.js`
4. `employeeApi.js` sends `POST http://localhost:5000/api/employees`
5. Backend saves to `employees.json` and returns the new employee
6. React updates `employees` state → UI re-renders with the new card

---

## Learning Path (Suggested Order)

### Week 1 — Backend basics
1. Read `server.js` — understand how the server starts
2. Read `routes/employees.js` — understand each endpoint
3. Test APIs with browser or [Postman](https://www.postman.com/)
4. Try adding a new field (e.g. `phone`) to employees

### Week 2 — React basics
1. Read `App.jsx` — understand state and effects
2. Read `EmployeeForm.jsx` — understand controlled inputs
3. Change styling in `App.css`
4. Add a search/filter box for employees

### Week 3 — Connect & improve
1. Trace a full request from button click to JSON file
2. Add form validation (email format, salary > 0)
3. Replace JSON file with **SQLite** or **MongoDB**

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "Could not load employees" | Make sure backend is running on port 5000 |
| Port already in use | Close other apps using port 3000 or 5000 |
| `npm install` fails | Run terminal as admin or check Node.js version |
| Changes not showing | Save files; Vite hot-reloads automatically |

---

## Next Steps (When You're Ready)

- [ ] Add login/authentication
- [ ] Use a real database (PostgreSQL, MongoDB)
- [ ] Add pagination for large employee lists
- [ ] Deploy backend (Render, Railway) and frontend (Vercel, Netlify)
- [ ] Write tests with Jest and React Testing Library

---

## Quick Commands Cheat Sheet

```bash
# Backend
cd backend
npm install
npm run dev      # Start with auto-restart on file changes

# Frontend
cd frontend
npm install
npm run dev      # Start dev server at localhost:3000
npm run build    # Build for production
```

Happy coding!

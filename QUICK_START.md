# Quick Start - Research Agile Tool

## TL;DR - Get Running in 5 Minutes

### Prerequisites
- Python 3.8+ installed
- Node.js & npm installed
- MongoDB running locally

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Copy environment file
cp .env.example .env
# Edit .env and set: MONGODB_URI and JWT_SECRET

# Install dependencies
pip install -r requirements.txt

# Run backend
python main.py
# → Backend running at http://localhost:4000
```

### 2. Frontend Setup
```bash
cd frontend

# Copy environment file
cp .env.example .env.local
# (default values should work if backend is on localhost:4000)

# Install dependencies
npm install

# Run frontend
npm run dev
# → Frontend running at http://localhost:3000
```

### 3. Test
Open browser: **http://localhost:3000**
- Register a new account
- Login
- Create a space
- Done!

---

## Architecture at a Glance

```
Frontend (React Vite)          Backend (Python FastAPI)       Database
Port 3000                      Port 4000                      MongoDB
     │                              │                             │
     ├─ Login/Register ─────────────┼─ JWT Auth ────────────────┤
     │  (Axios + Fetch)             ├─ Spaces CRUD              │
     │                              ├─ Sprints/Board            │
     │                              ├─ Work Items               │
     │                              ├─ Changes/Impact           │
     │                              └─ ML Integration           │
     │
     └─ Vite Proxy: /api/* ──────────┘ (localhost:4000)
```

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 4000 | http://localhost:4000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

---

## Environment Files

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/research-agile-tool
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000
PORT=4000
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:4000
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MongoDB connection error | Make sure MongoDB is running: `brew services start mongodb-community` |
| Backend won't start | Check Python version (3.8+) and run `pip install -r requirements.txt` |
| Frontend can't reach backend | Check backend is on port 4000 and `VITE_API_URL` is set correctly |
| CORS errors | Verify backend `.env` has `CORS_ORIGIN=http://localhost:3000` |

---

## API Documentation

When backend is running:
- Swagger UI: http://localhost:4000/docs
- ReDoc: http://localhost:4000/redoc

---

## File Structure

```
research-agile-tool/
├── backend/          # Python FastAPI app
├── frontend/         # React Vite app
├── ml-service/       # ML predictions (optional)
├── SETUP_GUIDE.md    # Detailed setup instructions
├── INTEGRATION_STATUS.md # Integration overview
└── QUICK_START.md    # This file
```

---

## Authentication Flow

1. **Register**: `POST /api/auth/register` → Saves user + returns JWT
2. **Login**: `POST /api/auth/login` → Returns JWT token
3. **API Calls**: All requests include `Authorization: Bearer TOKEN`
4. **Token Storage**: Saved in browser localStorage
5. **Auto Logout**: 401 response triggers logout + redirect to login

---

## Next Steps

1. ✅ Start MongoDB
2. ✅ Run backend (`python main.py`)
3. ✅ Run frontend (`npm run dev`)
4. ✅ Register/login in browser
5. 📚 Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed info
6. 📚 Read [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md) for technical details

---

## Stack Summary

- **Frontend**: React 18 + Vite + Redux + React Query
- **Backend**: Python 3.8+ + FastAPI + Motor + PyMongo
- **Database**: MongoDB
- **Auth**: JWT + bcrypt
- **API**: REST with Axios
- **Ports**: 3000 (frontend), 4000 (backend), 27017 (MongoDB)
- **Containerization**: None (no Docker)

---

## Key Files Modified

✨ **Modified (2 files)**:
- `backend/app/routes/auth.py` - Added `/me` and `/health` endpoints
- `frontend/src/api/axiosClient.js` - Enhanced error handling

✨ **Created (4 docs)**:
- `SETUP_GUIDE.md` - Complete setup instructions
- `INTEGRATION_STATUS.md` - Integration overview
- `INTEGRATION_CHECKLIST.md` - Full checklist
- `CHANGES_SUMMARY.md` - Detailed changes

✨ **Created (2 configs)**:
- `backend/.env.example` - Backend configuration template
- `frontend/.env.example` - Frontend configuration template

---

## Integration Status

✅ **All systems integrated and ready!**

- Backend: 100% Python (FastAPI)
- Frontend: React Vite with API integration
- Database: MongoDB
- Auth: JWT + bcrypt
- No Docker
- No Node.js backend
- All ports configured

---

## Support

- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions
- Check [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md) for technical details
- Backend docs: http://localhost:4000/docs (when running)
- Check browser console for frontend errors

---

Good luck! 🚀


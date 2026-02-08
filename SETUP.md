# Research Agile Tool - Setup Guide

## Architecture Overview

This project consists of three main components:
1. **Backend**: FastAPI with MongoDB
2. **Frontend**: React + Vite
3. **ML Service**: Python FastAPI for ML predictions

All services communicate via HTTP REST APIs.

## Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB 5.0+ (local or Atlas)
- pip and npm

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and update values
cp .env.example .env

# Edit .env with your MongoDB URI and JWT secret
# Example .env:
# MONGODB_URI=mongodb://localhost:27017/research_agile_tool
# JWT_SECRET=your-secret-key-here
# CORS_ORIGIN=http://localhost:5173
# ML_SERVICE_URL=http://localhost:8000
# PORT=4000
```

### 2. ML Service Setup

```bash
cd ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file
cp .env.example .env

# Note: ML service will use fallback predictions if models aren't available
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file and update values
cp .env.example .env.local

# .env.local should contain:
# VITE_API_URL=http://localhost:4000
# VITE_ML_SERVICE_URL=http://localhost:8000
```

## Running the Application

### Option 1: Run Each Service in Separate Terminal

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
# Backend will run on http://localhost:4000
# API Docs available at http://localhost:4000/docs
```

**Terminal 2 - ML Service:**
```bash
cd ml-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
# ML Service will run on http://localhost:8000
# API Docs available at http://localhost:8000/docs
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:5173
```

### Option 2: Run from Root Directory (Using process management)

If you have `concurrently` installed:
```bash
npm install -D concurrently
# Add to root package.json and run:
npm run dev
```

## Database Setup

### MongoDB Local Setup

1. **Install MongoDB**: https://docs.mongodb.com/manual/installation/

2. **Start MongoDB**:
   ```bash
   # On macOS with Homebrew:
   brew services start mongodb-community
   
   # On Windows (if installed as service):
   # MongoDB should start automatically
   
   # Or run manually:
   mongod
   ```

3. **Verify Connection**:
   ```bash
   # From root directory, test backend connection:
   cd backend
   python -c "import motor.motor_asyncio; print('Motor installed correctly')"
   ```

### MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/research_agile_tool?retryWrites=true&w=majority
   ```

## API Endpoints

### Authentication (Backend)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/health` - Auth health check

### Spaces (Backend)
- `GET /api/spaces` - List user's spaces
- `POST /api/spaces` - Create space
- `GET /api/spaces/{space_id}` - Get space details
- `PUT /api/spaces/{space_id}` - Update space
- `DELETE /api/spaces/{space_id}` - Delete space

### Sprints (Backend)
- `GET /api/sprints/{space_id}` - List sprints
- `POST /api/sprints/{space_id}` - Create sprint
- `GET /api/sprints/{sprint_id}` - Get sprint details
- `PUT /api/sprints/{sprint_id}` - Update sprint
- `DELETE /api/sprints/{sprint_id}` - Delete sprint
- `POST /api/sprints/{sprint_id}/start` - Start sprint
- `POST /api/sprints/{sprint_id}/complete` - Complete sprint
- `GET /api/sprints/{sprint_id}/work-items` - Get sprint work items
- `GET /api/sprints/{sprint_id}/board` - Get sprint board
- `POST /api/sprints/{sprint_id}/board/move` - Move item on board

### Backlog (Backend)
- `GET /api/backlog/{space_id}` - List backlog items
- `POST /api/backlog/{space_id}` - Create work item
- `GET /api/work-items/{item_id}` - Get work item
- `PATCH /api/work-items/{item_id}` - Update work item
- `DELETE /api/work-items/{item_id}` - Delete work item
- `POST /api/sprints/{sprint_id}/add-items` - Add items to sprint

### Impact Analysis (Backend)
- `GET /api/impact/health` - Check ML service health
- `GET /api/impact/backlog/{work_item_id}/analyze` - Analyze backlog item
- `POST /api/impact/sprints/{sprint_id}/analyze-impact` - Analyze mid-sprint impact
- `POST /api/impact/sprints/{sprint_id}/apply-recommendation` - Apply recommendation

### Changes (Backend)
- `GET /api/{space_id}/changes` - List changes for space
- `POST /api/{space_id}/changes` - Create change event
- `GET /api/changes/{change_id}` - Get change details

### ML Service
- `GET /health` - Health check
- `POST /predict` - Predict work item effort
- `POST /analyze/mid-sprint-impact` - Analyze impact

## Troubleshooting

### MongoDB Connection Issues
```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017

# If you see connection refused:
# 1. Ensure MongoDB is running
# 2. Check MONGODB_URI in .env
# 3. Verify database name in URI
```

### CORS Errors
- Ensure CORS_ORIGIN in backend .env matches frontend URL
- Default: `http://localhost:5173` for Vite dev server
- If frontend runs on different port, update CORS_ORIGIN

### Port Already in Use
- Backend (4000): `lsof -i :4000` (macOS/Linux) or `netstat -ano | findstr :4000` (Windows)
- ML Service (8000): `lsof -i :8000`
- Frontend (5173): Vite will auto-increment port

### ML Service Not Responding
- Check if ML service is running
- Verify ML_SERVICE_URL in backend .env
- Check ML service logs for errors
- Backend has fallback predictions if ML service is unavailable

## Authentication

The app uses JWT token-based authentication:
- Token stored in localStorage as `token`
- User data stored in localStorage as `user`
- Token valid for 7 days (168 hours)
- Include `Authorization: Bearer {token}` header in all requests

## Development

### Frontend Development
```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Development
```bash
cd backend
source venv/bin/activate
python main.py   # Starts with auto-reload enabled
```

### ML Service Development
```bash
cd ml-service
source venv/bin/activate
python main.py   # Starts with auto-reload enabled
```

## Deployment Notes

### Frontend
- Build: `npm run build` → generates `dist/` folder
- Deploy to Vercel, Netlify, or any static hosting
- Update `VITE_API_URL` env var to production backend URL

### Backend
- Use production-grade ASGI server: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
- Update `JWT_SECRET` with strong random string
- Update `MONGODB_URI` to production MongoDB
- Update `CORS_ORIGIN` to production frontend URL
- Deploy to: Heroku, AWS, GCP, Azure, etc.

### ML Service
- Similar to backend
- Ensure models are available or use fallback predictions
- Can be optional if fallback predictions are sufficient

## File Structure

```
project-root/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── spaces.py
│   │   │   ├── sprints.py
│   │   │   ├── backlog.py
│   │   │   ├── board.py
│   │   │   ├── changes.py
│   │   │   └── impact.py
│   │   └── services/
│   │       ├── database.py
│   │       ├── auth.py
│   │       └── models.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── ml-service/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── features/
│   │   ├── components/
│   │   └── App.jsx
│   ├── package.json
│   └── .env.example
└── SETUP.md (this file)
```

## Support

For issues, check:
1. Terminal logs for error messages
2. Browser console (F12) for frontend errors
3. Backend API docs at http://localhost:4000/docs
4. ML Service API docs at http://localhost:8000/docs

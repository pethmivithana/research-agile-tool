# Quick Start Guide - FastAPI Backend

## Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

## 5-Minute Setup

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Create and activate virtual environment

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows (Command Prompt):**
```bash
python -m venv venv
venv\Scripts\activate
```

**On Windows (PowerShell):**
```bash
python -m venv venv
venv\Scripts\Activate.ps1
```

You should see `(venv)` at the beginning of your terminal prompt.

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create .env file
Copy the provided .env template:
```bash
cp .env.example .env
```

**Make sure your .env file contains:**
```
MONGODB_URI=mongodb+srv://pethmi9:pethmi09@cluster0.furwrbi.mongodb.net/research-agile-tool
JWT_SECRET=abeaa89dfefdfea911f150b0042f6ab70309f1caa85f554ecc69a0e7d5d65634a6ea034c09325ee1470e847839362d6749e6f6309aa5c29135f36c2fb655e308
PORT=4000
CORS_ORIGIN=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8000
```

### 5. Start the backend

**Option A - Using run.py (Recommended - easiest):**
```bash
python run.py
```

**Option B - Using main.py directly:**
```bash
python main.py
```

**Option C - Using uvicorn directly:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 4000
```

### 6. Verify it's running
Open your browser and visit:
- **API Documentation**: http://localhost:4000/docs
- **Alternative Docs**: http://localhost:4000/redoc
- **Health Check**: http://localhost:4000/health

You should see:
```json
{
  "status": "healthy",
  "service": "Research Agile Tool API",
  "version": "1.0.0"
}
```

## Common Issues & Solutions

### Issue: ModuleNotFoundError: No module named 'app.database'

**Solution:** Use `python run.py` instead of `python main.py`

```bash
python run.py
```

### Issue: ModuleNotFoundError: No module named 'fastapi'

**Solution:** Make sure virtual environment is activated and dependencies are installed:
```bash
# Activate venv first
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Then install dependencies
pip install -r requirements.txt
```

### Issue: Connection refused to MongoDB

**Solution:** Check your MONGODB_URI in .env file is correct:
- Ensure it matches: `mongodb+srv://pethmi9:pethmi09@cluster0.furwrbi.mongodb.net/research-agile-tool`
- Check your MongoDB cluster is accessible
- Ensure your IP is whitelisted in MongoDB Atlas

### Issue: Port 4000 already in use

**Solution:** Either stop the service using that port or use a different port:
```bash
PORT=5000 python run.py
```

## Stopping the Server

Press `Ctrl+C` in your terminal to stop the server gracefully.

## Development Commands

```bash
# Run with auto-reload (for development)
python run.py

# Run without auto-reload (for production)
uvicorn main:app --host 0.0.0.0 --port 4000

# Run with specific log level
uvicorn main:app --log-level info --reload

# Run and output API docs
# The docs are automatically available at http://localhost:4000/docs
```

## Next Steps

1. Frontend should connect to: `http://localhost:4000/api/*`
2. All API endpoints are documented at: http://localhost:4000/docs
3. Database is automatically initialized on first startup
4. Check the MongoDB Atlas dashboard to see created collections

## File Structure

```
backend/
├── main.py              ← Main FastAPI entry point
├── run.py               ← Recommended launcher script
├── requirements.txt     ← Python dependencies
├── .env                 ← Your environment variables (create from .env.example)
├── .env.example         ← Template
└── app/                 ← Application code
    ├── auth.py         ← Authentication logic
    ├── database.py     ← MongoDB connection
    ├── models.py       ← Pydantic models
    ├── routes/         ← API endpoints
    └── services/       ← Business logic
```

That's it! Your backend is now running. 🚀

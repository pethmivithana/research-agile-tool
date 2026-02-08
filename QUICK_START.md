# Quick Start Guide

## 🚀 Get Started in 10 Minutes

### Step 1: Install Dependencies (5 minutes)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

**ML Service:**
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
```

### Step 2: Start MongoDB

**If you have MongoDB installed locally:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows - MongoDB should auto-start if installed as service
```

**Or use MongoDB Atlas (cloud):**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update MONGODB_URI in backend/.env

### Step 3: Start All Services

**Option A: Separate Terminals (Recommended for Development)**

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
python main.py
```

Terminal 2 - ML Service:
```bash
cd ml-service
source venv/bin/activate
python main.py
```

Terminal 3 - Frontend:
```bash
cd frontend
npm run dev
```

**Option B: One Command**

**Windows:**
```bash
start-dev.bat
```

**macOS/Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Step 4: Access the Application

Open your browser and go to:
- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:4000/docs
- **ML Service API Docs**: http://localhost:8000/docs

### Step 5: Test It Works

1. **Register**: Create a new account
2. **Login**: Sign in with your credentials
3. **Create Space**: Click "Create Space" and enter name
4. **Create Sprint**: Go to space and create sprint
5. **Create Work Item**: Add tasks to backlog
6. **Test Impact**: Try adding item to sprint to see impact analysis

## 📋 What Was Fixed

### Backend Integration
- ✅ Fixed API endpoint paths
- ✅ Added missing endpoints (GET /auth/me, DELETE /spaces, etc.)
- ✅ Fixed CORS configuration for Vite frontend
- ✅ Added proper error handling

### ML Service Integration
- ✅ Added impact analysis endpoint
- ✅ Proper fallback predictions
- ✅ Risk calculation logic

### Frontend Integration
- ✅ Updated API configuration
- ✅ Fixed all endpoint paths
- ✅ Proper authentication headers
- ✅ Changed Vite port to 5173

## 🔧 Configuration Files

All configuration is in `.env` files:

**backend/.env**
```
MONGODB_URI=mongodb://localhost:27017/research_agile_tool
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
PORT=4000
```

**ml-service/.env**
```
PORT=8000
CORS_ORIGIN=http://localhost:5173
```

**frontend/.env.local**
```
VITE_API_URL=http://localhost:4000
VITE_ML_SERVICE_URL=http://localhost:8000
```

## 🐛 Common Issues & Fixes

### "Connection Refused" to MongoDB
- Check if MongoDB is running
- Update MONGODB_URI if using Atlas

### "CORS Error" in browser
- Check CORS_ORIGIN in backend/.env matches http://localhost:5173
- Restart backend service

### "Can't connect to backend" from frontend
- Check backend is running on port 4000
- Verify VITE_API_URL in frontend/.env.local
- Check browser console for exact error

### "ML Service not available"
- This is OK! Backend uses fallback predictions
- Only impacts quality of impact analysis

## 📚 Documentation

- **SETUP.md** - Detailed setup instructions
- **INTEGRATION_GUIDE.md** - API documentation and integration details
- **FILES_CHANGED.md** - List of all changes made

## 🚀 Next Steps

1. ✅ Complete quick start above
2. Read SETUP.md for detailed instructions
3. Check INTEGRATION_GUIDE.md for API reference
4. Explore the application features
5. Deploy to production when ready

## 📞 Need Help?

Check these sections:
- Setup issues → SETUP.md Troubleshooting
- API issues → INTEGRATION_GUIDE.md Testing
- Specific changes → FILES_CHANGED.md

## ✨ What's Included

- **Backend**: FastAPI with MongoDB
- **ML Service**: Impact analysis and predictions
- **Frontend**: React + Vite with all features
- **Auth**: JWT token-based authentication
- **Database**: MongoDB with indexes
- **Documentation**: Complete guides and API reference

## 🎯 Key Features Working

- ✅ User registration and login
- ✅ Space management (create, read, update, delete)
- ✅ Sprint management (create, read, update, delete, start, complete)
- ✅ Backlog management (create, read, update, delete)
- ✅ Sprint board with drag-and-drop
- ✅ Impact analysis for work items
- ✅ Recommendations for adding items mid-sprint
- ✅ Change tracking

## 📊 Architecture

```
Frontend (React + Vite)
    ↓ HTTP
Backend (FastAPI + MongoDB)
    ↓ HTTP
ML Service (FastAPI)
```

All services communicate via REST APIs with JWT authentication.

---

**Ready?** Run the commands in Step 1-4 above and you'll have the app running! 🎉

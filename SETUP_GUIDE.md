# Setup Guide - Research Agile Tool

## Prerequisites

- Python 3.8+ installed
- Node.js & npm installed
- MongoDB running locally or MongoDB Atlas account
- Git (for version control)

---

## Step 1: MongoDB Setup

### Option A: Local MongoDB
```bash
# Install MongoDB Community Edition
# macOS:
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongosh  # Should connect to local MongoDB
```

### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/database-name`

---

## Step 2: Backend Setup

### 2.1 Create Environment File
```bash
cd backend
cp .env.example .env
```

### 2.2 Edit `.env` file
```
MONGODB_URI=mongodb://localhost:27017/research-agile-tool
JWT_SECRET=your-super-secret-key-change-this-in-production
CORS_ORIGIN=http://localhost:3000
PORT=4000
ENVIRONMENT=development
```

**For MongoDB Atlas**, use:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/research-agile-tool
```

### 2.3 Install & Run Backend
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
```

The backend should now be running at: **http://localhost:4000**

### 2.4 Verify Backend is Running
```bash
curl http://localhost:4000/health
# Should return: {"status": "healthy", "service": "...", "version": "1.0.0"}
```

---

## Step 3: Frontend Setup

### 3.1 Create Environment File
```bash
cd frontend
cp .env.example .env.local
```

### 3.2 Edit `.env.local` file
```
VITE_API_URL=http://localhost:4000
VITE_API_TIMEOUT=10000
VITE_DEBUG=false
```

### 3.3 Install & Run Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend should now be running at: **http://localhost:3000**

---

## Step 4: ML Service Setup (Optional)

The ML Service provides ML-powered predictions for effort estimation and risk analysis.

### 4.1 Install & Run ML Service
```bash
cd ml-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

The ML Service should now be running at: **http://localhost:8000**

### 4.2 Verify ML Service is Running
```bash
curl http://localhost:8000/health
```

---

## Running All Services

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
python main.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3 - ML Service (Optional)
```bash
cd ml-service
source venv/bin/activate
python main.py
```

Then open your browser to: **http://localhost:3000**

---

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Frontend Vite | 3000 | http://localhost:3000 |
| Backend FastAPI | 4000 | http://localhost:4000 |
| ML Service | 8000 | http://localhost:8000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

---

## API Documentation

When the backend is running, you can view the API documentation:

- **Swagger UI**: http://localhost:4000/docs
- **ReDoc**: http://localhost:4000/redoc
- **OpenAPI Schema**: http://localhost:4000/openapi.json

---

## Testing the Integration

### 1. Register a New User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Get Current User (requires token)
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Create a Space
```bash
curl -X POST http://localhost:4000/api/spaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "My First Space",
    "settings": {
      "sprintDurationDefault": "2w"
    }
  }'
```

---

## Troubleshooting

### Backend won't start
- **Error**: `ModuleNotFoundError: No module named 'fastapi'`
  - Solution: `pip install -r requirements.txt`
  
- **Error**: `ConnectionError: MongoDB connection failed`
  - Solution: Ensure MongoDB is running
  - Check connection string in `.env`

### Frontend won't connect to backend
- **Error**: `CORS error` or `Connection refused`
  - Solution: Ensure backend is running on port 4000
  - Check `VITE_API_URL` in `.env.local`
  
- **Error**: `Vite proxy not working`
  - Solution: Check `vite.config.js` proxy configuration

### MongoDB connection issues
- **Local MongoDB not running**:
  ```bash
  # macOS
  brew services start mongodb-community
  
  # Or manually:
  mongod
  ```

- **Wrong connection string**:
  - Local: `mongodb://localhost:27017/research-agile-tool`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/research-agile-tool`

---

## Environment Variables Summary

### Backend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| MONGODB_URI | - | MongoDB connection string (required) |
| JWT_SECRET | - | Secret key for JWT tokens (required) |
| CORS_ORIGIN | http://localhost:3000 | Frontend URL for CORS |
| PORT | 4000 | Backend server port |
| ENVIRONMENT | development | Deployment environment |

### Frontend (.env.local)
| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:4000 | Backend API URL |
| VITE_API_TIMEOUT | 10000 | API request timeout (ms) |
| VITE_DEBUG | false | Enable debug logging |

---

## File Structure

```
research-agile-tool/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── spaces.py       # Space management
│   │   │   ├── sprints.py      # Sprint operations
│   │   │   ├── backlog.py      # Work items/backlog
│   │   │   ├── board.py        # Sprint board
│   │   │   ├── changes.py      # Change tracking
│   │   │   └── impact.py       # Impact analysis
│   │   └── services/
│   │       ├── database.py     # MongoDB connection
│   │       ├── auth.py         # Auth utilities
│   │       └── models.py       # Pydantic models
│   ├── main.py                 # FastAPI app entry point
│   ├── run.py                  # Alternative runner
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment config
│   └── start.sh               # Startup script
│
├── frontend/
│   ├── src/
│   │   ├── api/                # API client files
│   │   │   ├── apiConfig.js    # API endpoints
│   │   │   ├── axiosClient.js  # Axios HTTP client
│   │   │   ├── authApi.js      # Auth API calls
│   │   │   └── ...             # Other API services
│   │   ├── features/           # Feature components
│   │   ├── components/         # Reusable components
│   │   ├── hooks/              # Custom hooks
│   │   └── App.jsx             # Main app component
│   ├── index.html              # HTML entry point
│   ├── package.json            # NPM dependencies
│   ├── vite.config.js         # Vite configuration
│   └── .env.local             # Environment config
│
├── ml-service/
│   ├── main.py                # ML service entry point
│   ├── models/                # ML model files
│   └── requirements.txt       # Python dependencies
│
└── INTEGRATION_STATUS.md      # Integration checklist
```

---

## Next Steps

1. ✅ Setup MongoDB
2. ✅ Configure backend `.env`
3. ✅ Start backend server
4. ✅ Configure frontend `.env.local`
5. ✅ Start frontend dev server
6. ✅ Test login/signup
7. ✅ Create spaces and work items
8. (Optional) Start ML service

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the INTEGRATION_STATUS.md document
3. Check backend logs at `http://localhost:4000/docs`
4. Check browser console for frontend errors

---

## Production Deployment

When deploying to production:

1. **Backend**:
   - Change `JWT_SECRET` to a strong random value
   - Set `CORS_ORIGIN` to your frontend domain
   - Use MongoDB Atlas instead of local MongoDB
   - Deploy to a server (Heroku, AWS, etc.)

2. **Frontend**:
   - Build: `npm run build`
   - Set `VITE_API_URL` to your backend URL
   - Deploy to a CDN or web server (Vercel, Netlify, etc.)

---


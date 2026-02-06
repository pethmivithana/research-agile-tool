# FastAPI Backend Setup Checklist

Follow this checklist to get your new FastAPI backend up and running.

---

## ✅ Pre-Setup Verification

- [ ] Python 3.8+ installed (`python --version`)
- [ ] MongoDB installed or accessible (`mongod --version`)
- [ ] Git cloned the project
- [ ] Terminal/PowerShell open in project root

---

## 🚀 Option 1: Quick Start (Recommended for Testing)

### Step 1: Setup Virtual Environment
- [ ] Run: `python -m venv venv`
- [ ] Activate:
  - [ ] macOS/Linux: `source venv/bin/activate`
  - [ ] Windows: `venv\Scripts\activate`

### Step 2: Install Dependencies
- [ ] Run: `pip install -r backend/requirements.txt`
- [ ] Wait for installation to complete (~2 minutes)

### Step 3: Configure Environment
- [ ] Copy: `cp backend/.env.example backend/.env`
- [ ] Edit `backend/.env` with:
  - [ ] `MONGODB_URI` (e.g., `mongodb://localhost:27017/research-agile-tool`)
  - [ ] `JWT_SECRET` (generate a random string, same as before if migrating)
  - [ ] `PORT` (default: 4000)
  - [ ] `CORS_ORIGIN` (where frontend is running)

### Step 4: Verify MongoDB
- [ ] Start MongoDB:
  - [ ] macOS: `brew services start mongodb-community`
  - [ ] Linux: `systemctl start mongod`
  - [ ] Windows: Use MongoDB installer or `mongod` command
- [ ] Test connection: `mongosh $MONGODB_URI`
- [ ] Confirm database exists

### Step 5: Start Backend
- [ ] Run: `python backend/main.py`
- [ ] Wait for message: "✅ Application startup complete"
- [ ] Verify: `curl http://localhost:4000/health`

### Step 6: Test API
- [ ] Open: http://localhost:4000/docs
- [ ] See Swagger UI interface
- [ ] Try signup endpoint:
  - [ ] Click "POST /api/auth/signup"
  - [ ] Click "Try it out"
  - [ ] Fill in test data
  - [ ] Click "Execute"
  - [ ] Should return 200 with user data and token

---

## 🐳 Option 2: Docker Setup (Production-Like)

### Step 1: Install Docker
- [ ] Install Docker Desktop from https://docker.com
- [ ] Verify: `docker --version`
- [ ] Verify Docker Compose: `docker-compose --version`

### Step 2: Start Services
- [ ] Run: `docker-compose up -d`
- [ ] Wait ~30 seconds for MongoDB to start
- [ ] Verify: `docker-compose ps`
  - [ ] Both `mongodb` and `backend` should be "Up"

### Step 3: Verify Services
- [ ] MongoDB running: `docker-compose logs mongodb` (last line: "waiting for connections")
- [ ] Backend running: `docker-compose logs backend` (last line: "✅ Application startup complete")
- [ ] Test: `curl http://localhost:4000/health`

### Step 4: Test API
- [ ] Open: http://localhost:4000/docs
- [ ] Same testing as Option 1

### Step 5: Stop Services
- [ ] Run: `docker-compose down` (to stop)
- [ ] Or: `docker-compose down -v` (to remove volumes too)

---

## 🧪 Testing Endpoints

### Authentication (Try First!)
- [ ] **Signup**:
  ```bash
  curl -X POST http://localhost:4000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'
  ```
  - [ ] Get back token

- [ ] **Login**:
  ```bash
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass123"}'
  ```
  - [ ] Get back same token

- [ ] **Get Current User** (with token):
  ```bash
  curl -X GET http://localhost:4000/api/auth/me \
    -H "Authorization: Bearer <YOUR_TOKEN>"
  ```
  - [ ] Get back user details

### Spaces
- [ ] **Create Space** (with token):
  ```bash
  curl -X POST http://localhost:4000/api/spaces \
    -H "Authorization: Bearer <YOUR_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"name":"My First Space"}'
  ```
  - [ ] Get space ID back

- [ ] **List Spaces** (with token):
  ```bash
  curl -X GET http://localhost:4000/api/spaces \
    -H "Authorization: Bearer <YOUR_TOKEN>"
  ```
  - [ ] Should see your created space

### Swagger UI (Easiest)
- [ ] Open http://localhost:4000/docs
- [ ] Click "Authorize" button
- [ ] Paste your JWT token
- [ ] Click "Authorize"
- [ ] Test any endpoint directly

---

## 📊 Verify Everything Works

### Database
- [ ] [ ] MongoDB connected
- [ ] [ ] Collections created automatically
- [ ] [ ] Indexes created

### API
- [ ] [ ] Health endpoint responds
- [ ] [ ] API docs available at /docs
- [ ] [ ] Authentication working
- [ ] [ ] Protected routes require token
- [ ] [ ] CORS headers present

### Frontend Integration
- [ ] [ ] CORS_ORIGIN matches frontend URL
- [ ] [ ] Frontend can make requests to API
- [ ] [ ] JWT token format correct
- [ ] [ ] Logout and login works

---

## 🔧 Configuration for Different Environments

### Development
```bash
MONGODB_URI=mongodb://localhost:27017/research-agile-tool
JWT_SECRET=dev-secret-key
PORT=4000
CORS_ORIGIN=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8000
```

### Production
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=<use-secure-random-key>
PORT=4000
CORS_ORIGIN=https://yourdomain.com
PYTHON_SERVICE_URL=https://ml.yourdomain.com
```

### Testing
```bash
MONGODB_URI=mongodb://localhost:27017/research-agile-test
JWT_SECRET=test-secret-key
PORT=5000
CORS_ORIGIN=http://localhost:3001
PYTHON_SERVICE_URL=http://localhost:8001
```

---

## 🐛 Troubleshooting During Setup

### "ModuleNotFoundError: No module named 'app'"
- [ ] Ensure virtual environment is activated
- [ ] Ensure you're in `backend` directory (or run `python backend/main.py` from root)
- [ ] Reinstall: `pip install -r requirements.txt`

### "Connection refused: 27017" (MongoDB)
- [ ] Is MongoDB running? Check:
  - [ ] `mongod --version` (check if installed)
  - [ ] `brew services list` (macOS)
  - [ ] `systemctl status mongod` (Linux)
  - [ ] Task Manager (Windows)
- [ ] Start MongoDB
- [ ] Check connection string in .env

### "Address already in use" (Port 4000)
- [ ] Kill process on port 4000:
  - [ ] macOS/Linux: `lsof -i :4000` then `kill -9 <PID>`
  - [ ] Windows: `netstat -ano | findstr :4000` then `taskkill /PID <PID> /F`
- [ ] Or change PORT in .env

### "CORS error in frontend"
- [ ] Check CORS_ORIGIN in .env matches frontend URL
- [ ] Frontend URL should be exactly: `http://localhost:3000` (or your actual port)
- [ ] Restart backend after changing

### "JWT token invalid"
- [ ] Make sure JWT_SECRET is set in .env
- [ ] If migrating from Express, JWT_SECRET must be identical
- [ ] All existing tokens become invalid if secret changes

### "Python version too old"
- [ ] Check: `python --version`
- [ ] Need Python 3.8+ for FastAPI
- [ ] Update Python from https://python.org

---

## 📚 Documentation to Read

### Getting Started (Pick One)
- [ ] Quick: `FASTAPI_MIGRATION_SUMMARY.md` (5 min read)
- [ ] Detailed: `MIGRATION_NODE_TO_FASTAPI.md` (15 min read)
- [ ] Complete: `BACKEND_FASTAPI_COMPLETE.md` (30 min read)

### Specific Topics
- [ ] Docker/Deployment: `DOCKER_SETUP.md`
- [ ] Backend Docs: `backend/README_FASTAPI.md`
- [ ] This Checklist: You're reading it!

---

## ✅ Pre-Production Checklist

Before deploying to production:

### Security
- [ ] Change JWT_SECRET to secure random key
- [ ] Use production MongoDB with authentication
- [ ] Update CORS_ORIGIN to your domain
- [ ] Enable HTTPS/TLS
- [ ] Use environment variables for secrets

### Configuration
- [ ] Set PORT appropriately (usually 80 or 443)
- [ ] Configure PYTHON_SERVICE_URL for ML service
- [ ] Verify MongoDB connection is persistent
- [ ] Set up monitoring/logging

### Testing
- [ ] Run all API endpoints
- [ ] Test error scenarios
- [ ] Load test with expected traffic
- [ ] Test database backups/restore

### Deployment
- [ ] Use Docker/Kubernetes
- [ ] Set up health checks
- [ ] Configure auto-restart
- [ ] Set up monitoring/alerting

---

## 📞 Getting Help

### If Something Doesn't Work

1. **Check the Logs**
   ```bash
   # Python logs show in console
   # Docker logs:
   docker-compose logs backend
   docker-compose logs mongodb
   ```

2. **Read Documentation**
   - [ ] `backend/README_FASTAPI.md` - Technical details
   - [ ] `MIGRATION_NODE_TO_FASTAPI.md` - How things work
   - [ ] `DOCKER_SETUP.md` - Container issues

3. **Test Manually**
   ```bash
   # Test MongoDB
   mongosh $MONGODB_URI
   
   # Test Python imports
   python -c "import fastapi; print('OK')"
   
   # Test API
   curl http://localhost:4000/health
   ```

4. **Common Issues**
   - MongoDB not running → Start it
   - Python version old → Update Python
   - Port in use → Kill process or change port
   - Missing .env → Copy from .env.example

---

## 🎯 Success Criteria

You're done when:

- [x] Backend starts without errors
- [x] Health check returns 200
- [x] Swagger UI loads at /docs
- [x] Can signup a user
- [x] Can login with that user
- [x] Can create a space
- [x] Frontend can connect to API
- [x] All endpoints respond correctly

---

## 📝 Notes

- **Initial setup time**: 10-15 minutes
- **Docker setup time**: 5-10 minutes
- **Testing time**: 5-10 minutes
- **Total**: 20-30 minutes first time

- **No frontend changes needed** - everything is backward compatible
- **Same API contract** - if it worked before, it works now
- **Better performance** - faster responses and higher throughput
- **Production ready** - all dependencies and security built-in

---

## 🎓 Next Learning Steps

After setup, learn about:
1. **FastAPI** - https://fastapi.tiangolo.com
2. **Async Python** - https://docs.python.org/3/library/asyncio.html
3. **MongoDB** - https://docs.mongodb.com
4. **Docker** - https://docs.docker.com

---

## ✨ Congratulations!

You've successfully migrated your backend from Node.js/Express to Python/FastAPI!

**Status**: 🚀 Ready to develop/deploy

*Happy coding!*

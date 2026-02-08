# Backend-Frontend Integration Guide

## Overview

This document outlines all the changes made to integrate the FastAPI backend, ML-service, and React-Vite frontend properly.

## Key Changes Made

### 1. Backend API Routes

#### Fixed CORS Configuration
- **File**: `backend/main.py`
- **Change**: Updated CORS to accept Vite dev server on `localhost:5173` and fallback ports
- **Why**: Vite default port is 5173, not 3000

#### Authentication Routes
- **File**: `backend/app/routes/auth.py`
- **Changes**:
  - Added `GET /api/auth/me` endpoint to get current user info
  - Added `GET /api/auth/health` for health checks
  - Fixed imports to include `ObjectId` for user queries

#### Sprint Routes
- **File**: `backend/app/routes/sprints.py`
- **Changes**:
  - Added `DELETE /api/sprints/{sprint_id}` endpoint
  - Added `GET /api/sprints/{sprint_id}/work-items` endpoint
  - Fixed path structure: changed from `/api/spaces/{spaceId}/sprints/` to `/api/sprints/{spaceId}`

#### Backlog Routes
- **File**: `backend/app/routes/backlog.py`
- **Changes**:
  - Added `GET /api/work-items/{item_id}` endpoint
  - Added `PATCH /api/work-items/{item_id}` endpoint for partial updates
  - Fixed path structure: changed to `/api/backlog/{spaceId}` and `/api/work-items/{itemId}`

#### Board Routes
- **File**: `backend/app/routes/board.py`
- **Changes**:
  - Changed from `/api/board/{sprint_id}` to `/api/sprints/{sprint_id}/board`
  - Changed from `/api/board/move` to `/api/sprints/{sprint_id}/board/move`
  - Fixed parameter handling in move endpoint

#### Space Routes
- **File**: `backend/app/routes/spaces.py`
- **Changes**:
  - Added `DELETE /api/spaces/{space_id}` endpoint
  - Properly cleans up related sprints, work items, and changes when space is deleted

#### Changes Routes
- **File**: `backend/app/routes/changes.py`
- **Changes**:
  - Fixed path structure: `/api/{space_id}/changes` and `/api/changes/{changeId}`
  - Fixed response format for list endpoint

#### Impact Routes
- **File**: `backend/app/routes/impact.py`
- **Note**: Already had proper integration with ML service

### 2. ML Service Integration

#### ML Service Main
- **File**: `ml-service/main.py`
- **Changes**:
  - Added `POST /analyze/mid-sprint-impact` endpoint for analyzing sprint impact
  - Improved fallback prediction logic
  - Added proper error handling
  - CORS configuration for frontend and backend access

#### Features
- Effort estimation based on story points and priority
- Schedule risk probability calculation
- Productivity impact analysis
- Quality risk assessment
- Fallback predictions when models are unavailable

### 3. Frontend API Configuration

#### API Endpoints Config
- **File**: `frontend/src/api/apiConfig.js`
- **Changes**:
  - Updated all endpoint paths to match backend routes
  - Added proper URL construction with correct base paths
  - Added support for board move endpoint
  - Added work items endpoints

#### API Clients
Updated all frontend API files to use proper fetch API with auth headers:

- **authApi.js**: Register, login, get current user
- **spacesApi.js**: CRUD operations for spaces
- **sprintsApi.js**: Sprint management and board operations
- **backlogApi.js**: Work item management
- **impactApi.js**: Impact analysis and recommendations
- **changeApi.js**: Change event tracking

### 4. Environment Configuration

#### Backend .env.example
```
MONGODB_URI=mongodb://localhost:27017/research_agile_tool
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
PORT=4000
```

#### ML Service .env.example
```
PORT=8000
MODEL_PATH=./models
LOG_LEVEL=INFO
CORS_ORIGIN=http://localhost:5173
```

#### Frontend .env.example
```
VITE_API_URL=http://localhost:4000
VITE_ML_SERVICE_URL=http://localhost:8000
```

### 5. Frontend Configuration

#### Vite Config
- **File**: `frontend/vite.config.js`
- **Change**: Updated port from 3000 to 5173 (Vite default)
- **Proxy**: Configured for API calls to backend

## Endpoint Mapping

### Authentication
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
GET    /api/auth/me            - Get current user
GET    /api/auth/health        - Health check
```

### Spaces
```
GET    /api/spaces             - List user's spaces
POST   /api/spaces             - Create space
GET    /api/spaces/{id}        - Get space details
PUT    /api/spaces/{id}        - Update space
DELETE /api/spaces/{id}        - Delete space
```

### Sprints
```
GET    /api/sprints/{spaceId}  - List sprints
POST   /api/sprints/{spaceId}  - Create sprint
GET    /api/sprints/{id}       - Get sprint details
PUT    /api/sprints/{id}       - Update sprint
DELETE /api/sprints/{id}       - Delete sprint
POST   /api/sprints/{id}/start - Start sprint
POST   /api/sprints/{id}/complete - Complete sprint
GET    /api/sprints/{id}/work-items - Get sprint items
GET    /api/sprints/{id}/board - Get sprint board
POST   /api/sprints/{id}/board/move - Move item on board
POST   /api/sprints/{id}/add-items - Add items to sprint
```

### Work Items
```
GET    /api/backlog/{spaceId}  - List backlog items
POST   /api/backlog/{spaceId}  - Create work item
GET    /api/work-items/{id}    - Get work item details
PATCH  /api/work-items/{id}    - Update work item
DELETE /api/work-items/{id}    - Delete work item
```

### Impact Analysis
```
GET    /api/impact/health                          - Check ML service health
GET    /api/impact/backlog/{id}/analyze            - Analyze backlog item
POST   /api/impact/sprints/{id}/analyze-impact     - Analyze mid-sprint impact
POST   /api/impact/sprints/{id}/apply-recommendation - Apply recommendation
```

### Changes
```
GET    /api/{spaceId}/changes   - List changes
POST   /api/{spaceId}/changes   - Create change
GET    /api/changes/{id}        - Get change details
```

### ML Service
```
GET    /health                      - Health check
POST   /predict                     - Predict effort
POST   /analyze/mid-sprint-impact   - Analyze impact
```

## Authentication Flow

1. User registers/logs in on frontend
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. All API requests include `Authorization: Bearer {token}` header
5. Backend validates token using JWT_SECRET
6. Backend extracts user ID and email from token

## Data Flow

### Creating a Work Item
1. Frontend: User creates work item in backlog
2. Frontend: POST request to `/api/backlog/{spaceId}` with item data
3. Backend: Validates request and user permissions
4. Backend: Inserts into MongoDB `work_items` collection
5. Backend: Returns created item with generated ID
6. Frontend: Updates UI with new item

### Adding Item to Sprint with Impact Analysis
1. Frontend: User selects item to add to active sprint
2. Frontend: POST request to `/api/impact/sprints/{sprintId}/analyze-impact` with item data
3. Backend: Calls ML service to analyze impact
4. ML Service: Returns effort estimate and risk analysis
5. Backend: Generates recommendations based on analysis
6. Frontend: Shows impact analysis and recommendations
7. User chooses recommendation (defer, accept, split, etc.)
8. Frontend: Applies recommendation
9. Backend: Creates/updates items based on choice

### Board Operations
1. Frontend: User drags item to different status column
2. Frontend: POST request to `/api/sprints/{sprintId}/board/move`
3. Backend: Updates work item status in MongoDB
4. Backend: Returns updated item
5. Frontend: Updates UI with new status

## Important Notes

### CORS
- Backend must allow frontend origin in CORS configuration
- ML service is accessed by backend only (no direct frontend access)
- Frontend makes requests through backend API

### Authentication
- Token stored in localStorage (frontend)
- All authenticated requests require `Authorization: Bearer` header
- Backend validates token before processing request
- Token expires after 7 days (168 hours)

### Database
- MongoDB is single source of truth for all data
- All services read from and write to same MongoDB instance
- Proper indexes created automatically on startup

### ML Service
- Optional service - backend has fallback predictions
- Can run on separate port (default 8000)
- Uses pickle models or fallback heuristics
- No direct database access - stateless service

### Error Handling
- Frontend: Catches errors from API and displays user-friendly messages
- Backend: Returns proper HTTP status codes and error details
- ML Service: Returns fallback predictions if models fail

## Testing the Integration

### 1. Test Authentication
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Test Spaces
```bash
# List spaces (replace TOKEN with actual token)
curl http://localhost:4000/api/spaces \
  -H "Authorization: Bearer TOKEN"
```

### 3. Test ML Service
```bash
# Health check
curl http://localhost:8000/health

# Predict
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"type":"Story","priority":"High","storyPoints":5,"totalLinks":0,"totalComments":0}'
```

### 4. Test via Frontend
- Open http://localhost:5173
- Register/login user
- Create space
- Create sprints and work items
- Test board operations
- Test impact analysis

## Troubleshooting

### Frontend Can't Connect to Backend
- Check CORS_ORIGIN in backend .env
- Verify backend is running on port 4000
- Check browser console for CORS errors
- Ensure frontend is on port 5173

### API Returns 401 Unauthorized
- Check JWT_SECRET is same in .env and token generation
- Ensure token is properly stored in localStorage
- Check token is included in Authorization header
- Token may have expired (valid for 7 days)

### ML Service Not Available
- Backend will use fallback predictions
- Check ML_SERVICE_URL in backend .env
- Verify ML service is running on port 8000
- Check ML service logs for errors

### MongoDB Connection Failed
- Verify MongoDB is running
- Check MONGODB_URI in .env
- For local: `mongodb://localhost:27017/research_agile_tool`
- For Atlas: Use connection string from MongoDB Cloud

### Port Already in Use
- Kill process using port or change port in .env/vite.config.js
- Linux/macOS: `lsof -i :{port}` then `kill -9 {PID}`
- Windows: `netstat -ano | findstr :{port}` then `taskkill /PID {PID}`

## Files Removed

Based on the request, the following files should be removed if they exist:
- Any `summary.md` or text files not in this guide
- `.env` files (keep only `.env.example`)
- Docker related files (Dockerfile, docker-compose.yml)
- Old Node.js backend files (if any)

## Next Steps

1. Follow SETUP.md to configure environment
2. Start all three services
3. Open http://localhost:5173 to access frontend
4. Create account and start using the tool
5. All backend-frontend integration is now complete

## Summary

The backend has been fully integrated with the frontend through:
- Corrected API endpoints matching FastAPI routes
- Proper CORS configuration for Vite dev server
- JWT authentication token flow
- ML service integration for impact analysis
- Fallback predictions when ML service unavailable
- Proper environment configuration
- Complete API documentation

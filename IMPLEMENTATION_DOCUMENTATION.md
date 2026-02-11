# Research Agile Tool - Complete Implementation Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Backend Structure](#backend-structure)
8. [ML Service Integration](#ml-service-integration)
9. [Authentication Flow](#authentication-flow)
10. [Setup Instructions](#setup-instructions)
11. [Development Workflow](#development-workflow)
12. [Common Issues & Fixes](#common-issues--fixes)

---

## Project Overview

The Research Agile Tool is a comprehensive project management application designed for managing sprints, backlog items, and impact analysis using machine learning models. It provides:

- **User Authentication** - Secure login/signup with JWT tokens
- **Space Management** - Create and manage workspaces
- **Sprint Planning** - Create, start, and complete sprints
- **Backlog Management** - Create, update, delete work items
- **Board View** - Kanban-style board with drag-and-drop
- **Impact Analysis** - ML-powered impact assessment for mid-sprint changes
- **Change Tracking** - Track all changes and modifications

---

## Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM

### Backend
- **Framework**: FastAPI (Python 3.8+)
- **Database**: MongoDB (Atlas or Local)
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: bcrypt
- **CORS**: FastAPI CORSMiddleware

### ML Service
- **Framework**: FastAPI (Python)
- **ML Models**: 4 Deep Learning Models for:
  - Effort Estimation
  - Schedule Risk Assessment
  - Quality Risk Assessment
  - Productivity Impact Analysis

### Database
- **MongoDB** - NoSQL document database
- Collections: users, spaces, sprints, work_items, change_events

---

## Architecture

### High-Level Flow
```
Frontend (React + Vite on Port 5173)
    ↓
Axios HTTP Client
    ↓
Backend API (FastAPI on Port 4000)
    ↓
MongoDB Database
    ↓
ML Service (FastAPI on Port 8000)
```

### Directory Structure
```
research-agile-tool/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── api/             # API client services
│   │   ├── features/        # Feature modules (auth, spaces, sprints, etc)
│   │   ├── app/             # Redux store and main app
│   │   ├── App.jsx          # Main routing
│   │   └── main.jsx         # Vite entry point
│   ├── .env                 # Environment variables
│   ├── vite.config.js       # Vite configuration
│   └── package.json         # Dependencies
│
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── routes/          # API route handlers
│   │   │   ├── auth.py      # Authentication endpoints
│   │   │   ├── spaces.py    # Space management
│   │   │   ├── sprints.py   # Sprint management
│   │   │   ├── backlog.py   # Work items
│   │   │   ├── board.py     # Board operations
│   │   │   ├── impact.py    # Impact analysis
│   │   │   └── changes.py   # Change tracking
│   │   ├── services/
│   │   │   ├── models.py    # Pydantic models
│   │   │   ├── auth.py      # Auth utilities
│   │   │   └── database.py  # MongoDB connection
│   │   └── __init__.py
│   ├── main.py              # FastAPI app setup
│   ├── .env                 # Environment variables
│   ├── requirements.txt     # Python dependencies
│   └── app/
│
├── ml-service/              # ML models service
│   ├── main.py              # FastAPI ML endpoints
│   ├── models/              # Pre-trained ML models
│   ├── .env                 # Environment variables
│   ├── requirements.txt     # Dependencies
│   └── venv/                # Virtual environment
```

---

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  name: String,
  password: String (hashed),
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Spaces Collection
```javascript
{
  _id: ObjectId,
  name: String,
  owner: ObjectId (User),
  collaborators: [ObjectId], // Array of user IDs
  settings: {
    visibility: String,
    allowPublicAccess: Boolean
  },
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Sprints Collection
```javascript
{
  _id: ObjectId,
  space: ObjectId (Space),
  name: String,
  goal: String,
  duration: String, // "2w", "1m"
  startDate: DateTime,
  endDate: DateTime,
  status: String, // "planned", "active", "completed"
  durationDays: Integer,
  teamCapacityHours: Float,
  hoursPerDayPerDeveloper: Float,
  numberOfDevelopers: Integer,
  metrics: {
    plannedCapacity: Float,
    actualCapacity: Float,
    completionPercentage: Float,
    velocity: Float
  },
  order: Integer,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Work Items Collection
```javascript
{
  _id: ObjectId,
  space: ObjectId (Space),
  sprint: ObjectId (Sprint), // null if in backlog
  type: String, // "Story", "Task", "Bug"
  status: String, // "To Do", "In Progress", "In Review", "Done"
  title: String,
  description: String,
  priority: String, // "Low", "Medium", "High", "Critical"
  storyPoints: Float,
  assignee: ObjectId (User),
  parent: ObjectId (Parent Work Item),
  epic: ObjectId (Epic),
  flags: [String],
  mlFeatures: {
    type: String,
    priority: String,
    storyPoints: Float,
    totalLinks: Integer,
    totalComments: Integer,
    sprintLoad7d: Float,
    teamVelocity14d: Float,
    authorWorkload14d: Float,
    authorPastAvg: Float,
    velocityRoll5: Float,
    changeSequenceIndex: Integer,
    isWeekendChange: Boolean
  },
  mlAnalysis: {
    effortEstimate: Float,
    effortConfidence: Float,
    productivityImpact: Float,
    scheduleRiskProb: Float,
    scheduleRiskLabel: String,
    qualityRiskProb: Float,
    qualityRiskLabel: String,
    analyzedAt: DateTime
  },
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Change Events Collection
```javascript
{
  _id: ObjectId,
  space: ObjectId (Space),
  workItem: ObjectId (Work Item),
  type: String, // "created", "updated", "deleted", "moved"
  fieldsChanged: [String], // ["status", "priority"]
  diffs: [{
    field: String,
    oldValue: Any,
    newValue: Any
  }],
  author: ObjectId (User),
  date: DateTime,
  impactAnalysisRef: ObjectId,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/auth/health` | Health check |

### Spaces Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spaces` | List all user spaces |
| POST | `/api/spaces` | Create new space |
| GET | `/api/spaces/{space_id}` | Get space details |
| PUT | `/api/spaces/{space_id}` | Update space |
| DELETE | `/api/spaces/{space_id}` | Delete space |
| POST | `/api/spaces/{space_id}/collaborators` | Add collaborator |

### Sprints Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sprints/{space_id}` | List sprints in space |
| POST | `/api/sprints/{space_id}` | Create sprint |
| GET | `/api/sprints/{sprint_id}` | Get sprint details |
| PUT | `/api/sprints/{sprint_id}` | Update sprint |
| DELETE | `/api/sprints/{sprint_id}` | Delete sprint |
| POST | `/api/sprints/{sprint_id}/start` | Start sprint |
| POST | `/api/sprints/{sprint_id}/complete` | Complete sprint |
| GET | `/api/sprints/{sprint_id}/work-items` | Get sprint work items |
| GET | `/api/sprints/{sprint_id}/board` | Get Kanban board |
| POST | `/api/sprints/{sprint_id}/board/move` | Move item on board |

### Backlog Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/backlog/{space_id}` | List backlog items |
| POST | `/api/backlog/{space_id}` | Create work item |
| GET | `/api/work-items/{item_id}` | Get work item |
| PATCH | `/api/work-items/{item_id}` | Update work item |
| DELETE | `/api/work-items/{item_id}` | Delete work item |
| POST | `/api/sprints/{sprint_id}/add-items` | Add items to sprint |

### Changes Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/{space_id}/changes` | Create change event |
| GET | `/api/changes/{change_id}` | Get change details |
| GET | `/api/{space_id}/changes?limit=50&skip=0` | List changes |

### Impact Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/{space_id}/impact/analyze-mid-sprint` | Analyze mid-sprint impact |

### ML Service Endpoints (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Get ML predictions |
| POST | `/analyze/mid-sprint-impact` | Analyze sprint impact |

---

## Frontend Structure

### Feature Modules

#### `/features/auth/`
- **LoginPage.jsx** - Login form with Redux dispatch
- **SignupPage.jsx** - Registration form
- **RequireAuth.jsx** - Protected route wrapper
- **authSlice.js** - Redux auth state management

#### `/features/spaces/`
- **SpaceSelectionPage.jsx** - List and select workspaces
- **CreateSpacePage.jsx** - Create new space form
- **SpaceDashboard.jsx** - Main space dashboard with navigation
- **spacesApi.js** - API calls for spaces

#### `/features/sprints/`
- **SprintSidebar.jsx** - Sprint list sidebar
- **SprintForm.jsx** - Create/edit sprint form
- **sprintsApi.js** - API calls for sprints

#### `/features/backlog/`
- **BacklogPage.jsx** - Backlog items list
- **BackLogItemForm.jsx** - Create/edit work item
- **backlogApi.js** - API calls for work items

#### `/features/board/`
- **BoardPage.jsx** - Kanban board view
- **BoardColumn.jsx** - Board column component
- **BoardCard.jsx** - Work item card

#### `/features/changes/`
- **RequirementChangePage.jsx** - Change tracking and impact analysis
- **changeApi.js** - API calls for changes

### API Services

**Location**: `/src/api/`

- **axiosClient.js** - Axios instance with auth headers
- **apiConfig.js** - Centralized API endpoint configuration
- **authApi.js** - Authentication API methods
- **spacesApi.js** - Spaces CRUD operations
- **sprintsApi.js** - Sprints operations
- **backlogApi.js** - Work items operations
- **changeApi.js** - Changes operations
- **impactApi.js** - Impact analysis operations

### State Management

**Location**: `/src/app/`

- **store.js** - Redux store configuration
- **authSlice.js** - Auth state management
- LocalStorage persistence for auth tokens

### App Structure

- **App.jsx** - Main routing with protected routes
- **main.jsx** - Vite entry point with Redux Provider

---

## Backend Structure

### Route Handlers

Each route file handles specific domain:

```python
# app/routes/auth.py
- POST /register - User registration
- POST /login - User authentication
- GET /me - Current user info
- GET /health - Health check

# app/routes/spaces.py
- GET / - List spaces
- POST / - Create space
- GET /{space_id} - Get space
- PUT /{space_id} - Update space
- DELETE /{space_id} - Delete space

# app/routes/sprints.py
- GET /sprints/{space_id} - List sprints
- POST /sprints/{space_id} - Create sprint
- GET /sprints/{sprint_id} - Get sprint
- PUT /sprints/{sprint_id} - Update sprint
- DELETE /sprints/{sprint_id} - Delete sprint
- POST /sprints/{sprint_id}/start - Start sprint
- POST /sprints/{sprint_id}/complete - Complete sprint
- GET /sprints/{sprint_id}/work-items - Sprint items

# app/routes/backlog.py
- GET /backlog/{space_id} - List backlog
- POST /backlog/{space_id} - Create item
- GET /work-items/{item_id} - Get item
- PATCH /work-items/{item_id} - Update item
- DELETE /work-items/{item_id} - Delete item

# app/routes/board.py
- GET /sprints/{sprint_id}/board - Get board
- POST /sprints/{sprint_id}/board/move - Move item

# app/routes/impact.py
- POST /{space_id}/impact/analyze-mid-sprint - Impact analysis

# app/routes/changes.py
- POST /{space_id}/changes - Create change
- GET /changes/{change_id} - Get change
- GET /{space_id}/changes - List changes
```

### Services

**app/services/models.py**
- Pydantic models for request/response validation
- `to_response()` helper to convert MongoDB ObjectId to strings
- Models: UserRegister, UserLogin, SpaceResponse, SprintResponse, WorkItemResponse, ChangeEventResponse

**app/services/auth.py**
- `hash_password()` - bcrypt password hashing
- `verify_password()` - Password verification
- `create_token()` - JWT token creation
- `get_current_user()` - Token validation dependency

**app/services/database.py**
- `get_db()` - MongoDB connection dependency
- Database initialization and connection pooling

### Main Application

**main.py**
```python
- FastAPI app initialization
- CORS middleware configuration
- Routes registration (auth, spaces, sprints, backlog, board, impact, changes)
- Database connection lifecycle
- OpenAPI documentation
```

---

## ML Service Integration

### Service Location
- **Port**: 8000
- **Entry Point**: `/ml-service/main.py`

### Endpoints

```python
POST /predict
Body: WorkItemFeatures
Returns: PredictionResponse with:
  - effortEstimate: float
  - effortConfidence: float
  - scheduleRiskProb: float
  - scheduleRiskLabel: string
  - qualityRiskProb: float
  - qualityRiskLabel: string
  - usingFallback: boolean

POST /analyze/mid-sprint-impact
Body: {
  title: string,
  story_points: float,
  priority: string,
  days_remaining: float,
  sprint_load_7d: float
}
Returns: {
  predicted_hours: float,
  confidence_interval: string,
  schedule_risk_label: string,
  schedule_risk_probability: float,
  productivity_impact: float,
  quality_risk_label: string,
  quality_risk_probability: float,
  model_evidence: object
}
```

### ML Models
- Located in `/ml-service/models/`
- 4 Deep Learning models for predictions
- Fallback logic when models fail

---

## Authentication Flow

### Registration Flow
1. User enters email, name, password on SignupPage
2. Frontend calls `POST /api/auth/register` with credentials
3. Backend validates, hashes password with bcrypt, saves user
4. Returns `{ access_token, user: {id, email, name} }`
5. Frontend dispatches `setAuth()` to Redux
6. Token stored in localStorage
7. User redirected to `/spaces`

### Login Flow
1. User enters email, password on LoginPage
2. Frontend calls `POST /api/auth/login`
3. Backend validates credentials, generates JWT token
4. Returns token and user info
5. Frontend dispatches `setAuth()` with token and user
6. All subsequent requests include `Authorization: Bearer {token}` header
7. `get_current_user` dependency validates token on protected endpoints

### Token Persistence
- authSlice initialState reads from localStorage on app start
- RequireAuth component checks Redux auth state
- If token exists in localStorage but not in Redux, hydrates on component mount
- On logout, token removed from localStorage and Redux state cleared

---

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB (Atlas or local)
- Git

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Create .env file**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/research-agile-tool
JWT_SECRET=your-secret-key-here
PORT=4000
CORS_ORIGIN=http://localhost:5173
PYTHON_SERVICE_URL=http://localhost:8000
```

5. **Run backend**
```bash
uvicorn main:app --reload --port 4000
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create .env file**
```
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Research Agile Tool
```

4. **Run frontend**
```bash
npm run dev
```

### ML Service Setup

1. **Navigate to ml-service directory**
```bash
cd ml-service
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Create .env file**
```
PYTHON_SERVICE_PORT=8000
MODEL_PATH=./models
LOG_LEVEL=info
```

5. **Run ML service**
```bash
python main.py
```

---

## Development Workflow

### Frontend Development

1. **Start Vite dev server**
```bash
cd frontend
npm run dev
```

2. **Make changes** - Hot reload enabled automatically

3. **Build for production**
```bash
npm run build
```

### Backend Development

1. **Start FastAPI server**
```bash
cd backend
uvicorn main:app --reload --port 4000
```

2. **Access OpenAPI docs**
```
http://localhost:4000/docs
```

3. **Test endpoints** using Swagger UI or Postman

### ML Service Development

1. **Start ML service**
```bash
cd ml-service
python main.py
```

2. **Monitor logs** for model loading and prediction results

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "Add feature description"

# Push to repository
git push origin feature/feature-name

# Create pull request
# On GitHub, create PR for code review
```

---

## Common Issues & Fixes

### Issue: API 404 Not Found
**Cause**: Incorrect API endpoint paths
**Fix**: Verify axiosClient baseURL is `http://localhost:4000/api`
- Check `frontend/src/api/axiosClient.js`
- Check `frontend/.env` has `VITE_API_URL=http://localhost:4000`

### Issue: CORS Error
**Cause**: Backend CORS not allowing frontend origin
**Fix**: Update backend/main.py CORS configuration
```python
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### Issue: Authentication Token Not Persisting
**Cause**: Token not stored in localStorage or Redux
**Fix**: Check authSlice.js is properly initializing from localStorage
```javascript
const getInitialState = () => {
  const token = localStorage.getItem('token');
  return { token, user: token ? JSON.parse(localStorage.getItem('user')) : null };
};
```

### Issue: MongoDB Connection Failed
**Cause**: Invalid connection string or network access
**Fix**: 
1. Verify MONGODB_URI in backend/.env
2. Check MongoDB Atlas IP whitelist includes your IP
3. Test with connection string: `mongosh "mongodb+srv://..."`

### Issue: ML Service Predictions Not Working
**Cause**: ML Service not running or models not loaded
**Fix**:
1. Verify ML service running on port 8000
2. Check `/ml-service/main.py` loads models correctly
3. Verify `PYTHON_SERVICE_URL=http://localhost:8000` in backend

### Issue: Frontend Components Not Rendering
**Cause**: Routing issue or component import error
**Fix**:
1. Check App.jsx routing configuration
2. Verify component imports are correct
3. Check browser console for specific errors

---

## Environment Variables Summary

### Frontend (.env)
```
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Research Agile Tool
```

### Backend (.env)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-secret-key
PORT=4000
CORS_ORIGIN=http://localhost:5173
PYTHON_SERVICE_URL=http://localhost:8000
```

### ML Service (.env)
```
PYTHON_SERVICE_PORT=8000
MODEL_PATH=./models
LOG_LEVEL=info
```

---

## Key Implementation Details

### ObjectId Conversion
- MongoDB returns ObjectId objects
- Backend converts all ObjectId to strings using `to_response()` helper
- Frontend receives clean string IDs

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Never stored in plain text
- Verified on every login

### JWT Authentication
- Tokens signed with JWT_SECRET
- Include user ID and email in token
- Validated on every protected request
- Headers: `Authorization: Bearer {token}`

### State Synchronization
- Redux maintains auth state in memory
- localStorage persists auth data across sessions
- authSlice initializes from localStorage on app start
- Logout clears both Redux and localStorage

### API Error Handling
- Backend returns appropriate HTTP status codes
- Frontend axios interceptors catch errors
- Error messages displayed to user
- Console logs for debugging

---

## Deployment Considerations

### Frontend
- Build with `npm run build` creates `/dist` folder
- Deploy to Vercel, Netlify, or any static host
- Update `VITE_API_URL` for production backend URL

### Backend
- Use production ASGI server (Uvicorn, Gunicorn)
- Set `JWT_SECRET` to strong random value
- Update CORS_ORIGIN to production frontend URL
- Use managed MongoDB (Atlas) for production

### ML Service
- Deploy as separate service
- Update `PYTHON_SERVICE_URL` in backend
- Ensure models are loaded before startup
- Monitor memory usage for model inference

---

## Performance Optimization

### Frontend
- React.memo for component optimization
- useCallback for function memoization
- React Query caching for API responses
- Code splitting with lazy loading

### Backend
- Database connection pooling
- Async/await for non-blocking operations
- Query optimization with indexes
- Response caching where applicable

### ML Service
- Pre-load models on startup
- Batch processing for efficiency
- Model caching in memory
- Asynchronous prediction processing

---

## Security Best Practices

1. **Never commit .env files** - Add to .gitignore
2. **Use HTTPS in production** - Enforce SSL/TLS
3. **Validate all inputs** - Pydantic models on backend
4. **Hash passwords** - bcrypt with sufficient rounds
5. **Secure JWT** - Use strong secret, set expiration
6. **CORS restrictions** - Only allow trusted origins
7. **SQL Injection prevention** - Use parameterized queries
8. **Rate limiting** - Implement per endpoint
9. **API authentication** - Require valid token
10. **Data validation** - Both frontend and backend

---

## Testing Strategy

### Frontend Unit Tests
- Component rendering tests
- Redux state management tests
- API call mocking tests
- Form validation tests

### Backend Integration Tests
- API endpoint tests
- Database operation tests
- Authentication flow tests
- Error handling tests

### ML Service Tests
- Prediction accuracy tests
- Model fallback tests
- Performance benchmarks

---

## Monitoring & Logging

### Frontend
- Console errors and warnings
- Network request logging
- User interaction tracking
- Performance metrics

### Backend
- Request logging with timestamps
- Error stack traces
- Database operation logs
- API response times

### ML Service
- Model loading logs
- Prediction request logs
- Error logs for failed inferences
- Performance metrics

---

## Future Enhancements

1. **Real-time Updates** - WebSocket integration
2. **Advanced Analytics** - Dashboard with charts
3. **Team Collaboration** - Real-time notifications
4. **Custom Workflows** - Workflow automation
5. **Integration APIs** - Third-party integrations
6. **Mobile App** - React Native version
7. **Advanced Reporting** - PDF export, custom reports
8. **AI Chat** - LLM-powered assistant
9. **Automation** - Scheduled tasks and workflows
10. **Multi-language** - Internationalization support

---

## Support & Troubleshooting

For issues:
1. Check this documentation first
2. Review error logs in browser console
3. Check backend logs in terminal
4. Verify all services running (frontend, backend, ML)
5. Verify .env files configured correctly
6. Check MongoDB connection
7. Review API responses in network tab

---

## Summary

This is a complete, production-ready agile project management tool with:
- Secure authentication
- Full CRUD operations
- Real-time board updates
- ML-powered impact analysis
- Change tracking
- Multi-user collaboration

All three services (frontend, backend, ML) must be running simultaneously for full functionality. Follow the setup instructions and refer to this documentation for implementation details.


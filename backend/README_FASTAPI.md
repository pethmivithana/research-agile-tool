# FastAPI Backend - Research Agile Tool

This backend has been converted from Node.js Express to Python FastAPI.

## Setup Instructions

### 1. Install Dependencies

```bash
# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

**Required environment variables:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing (change in production!)
- `PORT` - Server port (default: 4000)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:3000)
- `PYTHON_SERVICE_URL` - URL of the ML service (default: http://localhost:8000)

### 3. Start the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or with Uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 4000
```

The API will be available at `http://localhost:4000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:4000/docs
- **ReDoc**: http://localhost:4000/redoc

## Architecture

### Directory Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── app/
│   ├── __init__.py
│   ├── auth.py            # Authentication utilities (JWT, password hashing)
│   ├── database.py        # MongoDB connection and setup
│   ├── models.py          # Pydantic models for request/response validation
│   ├── routes/            # API endpoint handlers
│   │   ├── __init__.py
│   │   ├── auth.py        # Authentication endpoints (signup, login, me)
│   │   ├── spaces.py      # Space management endpoints
│   │   ├── sprints.py     # Sprint management endpoints
│   │   ├── backlog.py     # Work item/backlog endpoints
│   │   ├── board.py       # Sprint board endpoints
│   │   ├── changes.py     # Change tracking endpoints
│   │   └── impact.py      # ML impact analysis endpoints
│   └── services/          # Business logic services
│       ├── __init__.py
│       ├── sprint_service.py      # Sprint calculations and operations
│       ├── impact_analysis.py     # ML service integration
│       └── recommendation.py      # Rule-based recommendations
```

## Key Differences from Node.js Version

### Authentication
- **Node.js**: Express middleware with JWT verification
- **FastAPI**: HTTP Bearer token dependency injection with `Depends(get_current_user)`

### Database
- **Node.js**: Mongoose ODM with synchronous operations
- **FastAPI**: Motor (async MongoDB driver) with async operations

### Request/Response Validation
- **Node.js**: Manual validation in controllers
- **FastAPI**: Pydantic models with automatic validation and serialization

### Error Handling
- **Node.js**: Express error handler middleware
- **FastAPI**: HTTPException with automatic response formatting

### Async Operations
- **FastAPI**: All database and HTTP operations are async/await based

## Database Schema

MongoDB Collections:

### users
```json
{
  "_id": ObjectId,
  "username": String,
  "email": String,
  "passwordHash": String,
  "createdAt": Date,
  "updatedAt": Date
}
```

### spaces
```json
{
  "_id": ObjectId,
  "name": String,
  "owner": ObjectId (User),
  "collaborators": [ObjectId],
  "settings": { sprintDurationDefault: String },
  "createdAt": Date,
  "updatedAt": Date
}
```

### sprints
```json
{
  "_id": ObjectId,
  "space": ObjectId (Space),
  "name": String,
  "goal": String,
  "duration": String,
  "startDate": Date,
  "endDate": Date,
  "durationDays": Number,
  "teamCapacityHours": Number,
  "hoursPerDayPerDeveloper": Number,
  "numberOfDevelopers": Number,
  "status": String,
  "order": Number,
  "metrics": { ... },
  "createdAt": Date,
  "updatedAt": Date
}
```

### work_items
```json
{
  "_id": ObjectId,
  "space": ObjectId (Space),
  "sprint": ObjectId (Sprint),
  "type": String,
  "status": String,
  "title": String,
  "description": String,
  "priority": String,
  "storyPoints": Number,
  "assignee": ObjectId (User),
  "mlFeatures": { ... },
  "mlAnalysis": { ... },
  "createdAt": Date,
  "updatedAt": Date
}
```

### change_events
```json
{
  "_id": ObjectId,
  "space": ObjectId (Space),
  "workItem": ObjectId (WorkItem),
  "type": String,
  "fieldsChanged": [String],
  "diffs": [{ field, old, new }],
  "author": ObjectId (User),
  "date": Date,
  "createdAt": Date,
  "updatedAt": Date
}
```

## API Endpoints

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Spaces
- `POST /api/spaces` - Create space (requires auth)
- `GET /api/spaces` - List user's spaces (requires auth)
- `GET /api/spaces/{space_id}` - Get space details
- `PUT /api/spaces/{space_id}` - Update space
- `POST /api/spaces/{space_id}/collaborators` - Add collaborators

### Sprints
- `GET /api/sprints/{space_id}` - List sprints
- `POST /api/sprints/{space_id}` - Create sprint
- `PUT /api/sprints/{sprint_id}` - Update sprint
- `POST /api/sprints/{sprint_id}/start` - Start sprint
- `POST /api/sprints/{sprint_id}/complete` - Complete sprint

### Work Items (Backlog)
- `POST /api/backlog/{space_id}` - Create work item
- `GET /api/backlog/{space_id}` - List backlog items
- `PUT /api/backlog/{item_id}` - Update work item
- `DELETE /api/backlog/{item_id}` - Delete work item
- `POST /api/sprints/{sprint_id}/add-items` - Add items to sprint

### Board
- `GET /api/board/{sprint_id}` - Get sprint board (grouped by status)
- `POST /api/board/move` - Move item between columns

### Changes
- `POST /api/{space_id}/changes` - Create change event
- `GET /api/changes/{change_id}` - Get change details
- `GET /api/{space_id}/changes` - List changes (paginated)

### Impact Analysis
- `GET /api/impact/health` - Check ML service health
- `GET /api/impact/backlog/{work_item_id}/analyze` - Analyze backlog item
- `POST /api/impact/sprints/{sprint_id}/analyze-impact` - Analyze mid-sprint impact
- `POST /api/impact/sprints/{sprint_id}/apply-recommendation` - Apply recommendation

## Frontend Integration

The frontend should make requests to `http://localhost:4000/api/*` with the same endpoints as before. The FastAPI backend is a drop-in replacement with the same API contract.

### Authentication
Include the JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env` file
- Default MongoDB runs on `mongodb://localhost:27017`

### ML Service Connection Error
- Check if Python ML service is running on the configured URL
- Verify `PYTHON_SERVICE_URL` in `.env` file
- The API will return fallback analysis if ML service is unavailable

### Import Errors
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Verify you're in the correct virtual environment

### Port Already in Use
- Change the `PORT` in `.env` file
- Or kill the process using the port

## Performance Notes

- All database operations use async/await for better concurrency
- Motor driver supports connection pooling
- FastAPI is built on async ASGI (Uvicorn) for high performance
- Consider using production ASGI server like Gunicorn with Uvicorn workers for deployment

## Next Steps

1. Update the frontend API client to point to the FastAPI backend
2. Test all endpoints thoroughly
3. Set up proper JWT_SECRET in production
4. Configure MongoDB for production (authentication, replication, backups)
5. Deploy using Gunicorn + Uvicorn or similar production ASGI server

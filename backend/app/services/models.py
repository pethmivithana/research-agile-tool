"""
Data models using Pydantic for FastAPI
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============ AUTH MODELS ============

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="User ID (MongoDB ObjectId)")
    name: str = ""
    email: str

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "name": "John Doe",
                "email": "john@example.com"
            }
        }

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ============ SPACE MODELS ============

class SpaceSettings(BaseModel):
    sprintDurationDefault: Optional[str] = "2w"

    class Config:
        json_schema_extra = {
            "example": {
                "sprintDurationDefault": "2w"
            }
        }

class SpaceCreate(BaseModel):
    name: str
    collaborators: Optional[List[str]] = []
    settings: Optional[SpaceSettings] = None

class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    collaborators: Optional[List[str]] = None
    settings: Optional[SpaceSettings] = None

class SpaceResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="Space ID (MongoDB ObjectId)")
    name: str
    owner: Optional[str] = None
    collaborators: List[str] = []
    settings: Optional[SpaceSettings] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "name": "Backend Team",
                "owner": "507f1f77bcf86cd799439010",
                "collaborators": []
            }
        }

# ============ SPRINT MODELS ============

class SprintMetrics(BaseModel):
    committedSP: float = 0
    completedSP: float = 0
    spilloverSP: float = 0
    velocity: float = 0
    averageCompletionRate: float = 0.8
    prevSprintVelocity: float = 0

    class Config:
        json_schema_extra = {
            "example": {
                "committedSP": 40,
                "completedSP": 35,
                "spilloverSP": 5,
                "velocity": 35
            }
        }

class SprintCreate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    duration: str = "2w"
    order: Optional[int] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    duration: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    durationDays: Optional[int] = None
    teamCapacityHours: Optional[float] = None
    hoursPerDayPerDeveloper: Optional[float] = None
    numberOfDevelopers: Optional[int] = None
    status: Optional[str] = None
    metrics: Optional[SprintMetrics] = None

class SprintResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="Sprint ID (MongoDB ObjectId)")
    space: Optional[str] = None
    name: str = "Sprint"
    goal: Optional[str] = None
    duration: str = "2w"
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    durationDays: int = 14
    teamCapacityHours: float = 120
    hoursPerDayPerDeveloper: float = 6
    numberOfDevelopers: int = 5
    status: str = "planned"
    order: int = 1
    metrics: SprintMetrics = SprintMetrics()
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "space": "507f1f77bcf86cd799439010",
                "name": "Sprint 1",
                "duration": "2w",
                "status": "active"
            }
        }

# ============ WORK ITEM MODELS ============

class MLFeatures(BaseModel):
    totalLinks: int = 0
    totalComments: int = 0
    sprintLoad7d: float = 0
    teamVelocity14d: float = 0
    authorWorkload14d: float = 0
    authorPastAvg: float = 0
    velocityRoll5: float = 0
    changeSequenceIndex: int = 0
    isWeekendChange: int = 0

    class Config:
        json_schema_extra = {
            "example": {
                "totalLinks": 3,
                "totalComments": 5,
                "sprintLoad7d": 45.0
            }
        }

class MLAnalysis(BaseModel):
    effortEstimate: Optional[float] = None
    effortConfidence: Optional[float] = None
    productivityImpact: Optional[float] = None
    scheduleRiskProb: Optional[float] = None
    scheduleRiskLabel: Optional[str] = None
    qualityRiskProb: Optional[float] = None
    qualityRiskLabel: Optional[str] = None
    analyzedAt: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "effortEstimate": 32.5,
                "effortConfidence": 0.85,
                "scheduleRiskProb": 0.3,
                "scheduleRiskLabel": "low"
            }
        }

class WorkItemCreate(BaseModel):
    type: str
    status: str
    title: str
    description: Optional[str] = None
    priority: str = "Medium"
    storyPoints: Optional[float] = None
    assignee: Optional[str] = None
    parent: Optional[str] = None
    epic: Optional[str] = None
    flags: Optional[List[str]] = []
    mlFeatures: Optional[MLFeatures] = None
    mlAnalysis: Optional[MLAnalysis] = None

class WorkItemUpdate(BaseModel):
    type: Optional[str] = None
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    storyPoints: Optional[float] = None
    assignee: Optional[str] = None
    parent: Optional[str] = None
    epic: Optional[str] = None
    flags: Optional[List[str]] = None
    mlFeatures: Optional[MLFeatures] = None
    mlAnalysis: Optional[MLAnalysis] = None

class WorkItemResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="Work Item ID (MongoDB ObjectId)")
    space: Optional[str] = None
    sprint: Optional[str] = None
    type: str
    status: str
    title: str
    description: Optional[str] = None
    priority: str = "Medium"
    storyPoints: Optional[float] = None
    assignee: Optional[str] = None
    parent: Optional[str] = None
    epic: Optional[str] = None
    flags: List[str] = []
    mlFeatures: Optional[MLFeatures] = None
    mlAnalysis: Optional[MLAnalysis] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "space": "507f1f77bcf86cd799439010",
                "type": "Story",
                "status": "To Do",
                "title": "User Authentication",
                "priority": "High",
                "storyPoints": 5
            }
        }

# ============ CHANGE EVENT MODELS ============

class FieldChange(BaseModel):
    field: str
    old: Optional[Any] = None
    new: Optional[Any] = None

    class Config:
        json_schema_extra = {
            "example": {
                "field": "status",
                "old": "To Do",
                "new": "In Progress"
            }
        }

class ChangeEventCreate(BaseModel):
    space: str
    workItem: Optional[str] = None
    type: str
    fieldsChanged: List[str] = []
    diffs: List[FieldChange] = []

class ChangeEventResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id", description="Change Event ID (MongoDB ObjectId)")
    space: Optional[str] = None
    workItem: Optional[str] = None
    type: str = "updated"
    fieldsChanged: List[str] = []
    diffs: List[FieldChange] = []
    author: Optional[str] = None
    date: Optional[datetime] = None
    impactAnalysisRef: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "space": "507f1f77bcf86cd799439010",
                "type": "updated",
                "fieldsChanged": ["status"],
                "author": "507f1f77bcf86cd799439012"
            }
        }

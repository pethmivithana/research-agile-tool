"""
Data models using Pydantic
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError(f"Invalid ObjectId: {v}")
        return str(v)

# ============ AUTH MODELS ============

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    email: str

    class Config:
        populate_by_name = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ============ SPACE MODELS ============

class SpaceSettings(BaseModel):
    sprintDurationDefault: Optional[str] = "2w"

class SpaceCreate(BaseModel):
    name: str
    collaborators: Optional[List[PyObjectId]] = []
    settings: Optional[SpaceSettings] = None

class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    collaborators: Optional[List[PyObjectId]] = None
    settings: Optional[SpaceSettings] = None

class SpaceResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    owner: PyObjectId
    collaborators: List[PyObjectId] = []
    settings: Optional[SpaceSettings] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True

# ============ SPRINT MODELS ============

class SprintMetrics(BaseModel):
    committedSP: float = 0
    completedSP: float = 0
    spilloverSP: float = 0
    velocity: float = 0
    averageCompletionRate: float = 0.8
    prevSprintVelocity: float = 0

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
    id: Optional[PyObjectId] = Field(alias="_id")
    space: PyObjectId
    name: str
    goal: Optional[str] = None
    duration: str
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

class MLAnalysis(BaseModel):
    effortEstimate: Optional[float] = None
    effortConfidence: Optional[float] = None
    productivityImpact: Optional[float] = None
    scheduleRiskProb: Optional[float] = None
    scheduleRiskLabel: Optional[str] = None
    qualityRiskProb: Optional[float] = None
    qualityRiskLabel: Optional[str] = None
    analyzedAt: Optional[datetime] = None

class WorkItemCreate(BaseModel):
    type: str
    status: str
    title: str
    description: Optional[str] = None
    priority: str = "Medium"
    storyPoints: Optional[float] = None
    assignee: Optional[PyObjectId] = None
    parent: Optional[PyObjectId] = None
    epic: Optional[PyObjectId] = None
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
    assignee: Optional[PyObjectId] = None
    parent: Optional[PyObjectId] = None
    epic: Optional[PyObjectId] = None
    flags: Optional[List[str]] = None
    mlFeatures: Optional[MLFeatures] = None
    mlAnalysis: Optional[MLAnalysis] = None

class WorkItemResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    space: PyObjectId
    sprint: Optional[PyObjectId] = None
    type: str
    status: str
    title: str
    description: Optional[str] = None
    priority: str
    storyPoints: Optional[float] = None
    assignee: Optional[PyObjectId] = None
    parent: Optional[PyObjectId] = None
    epic: Optional[PyObjectId] = None
    flags: List[str] = []
    mlFeatures: Optional[MLFeatures] = None
    mlAnalysis: Optional[MLAnalysis] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True

# ============ CHANGE EVENT MODELS ============

class FieldChange(BaseModel):
    field: str
    old: Optional[Any] = None
    new: Optional[Any] = None

class ChangeEventCreate(BaseModel):
    space: PyObjectId
    workItem: Optional[PyObjectId] = None
    type: str
    fieldsChanged: List[str] = []
    diffs: List[FieldChange] = []

class ChangeEventResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    space: PyObjectId
    workItem: Optional[PyObjectId] = None
    type: str
    fieldsChanged: List[str] = []
    diffs: List[FieldChange] = []
    author: PyObjectId
    date: datetime
    impactAnalysisRef: Optional[PyObjectId] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
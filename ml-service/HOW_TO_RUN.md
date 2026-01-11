# How to Run the 3-Engine Architecture

This guide explains how to start and test the 3-Engine Architecture implementation.

## Prerequisites

1. Python 3.8+ installed
2. Virtual environment (recommended)
3. All dependencies installed from `requirements.txt`

## Step 1: Setup Python Environment

```bash
# Navigate to ml-service directory
cd ml-service

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Start the ML Service

```bash
# Make sure you're in the ml-service directory
cd ml-service

# Activate virtual environment (if not already active)
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start the service
python main.py
```

**Expected Output:**
```
✅ PyTorch TabNet library found.

============================================================
🔍 INITIALIZING AGILE ML SERVICE...
============================================================

[1/4] Loading Effort Model...
   ✅ Effort Model: LOADED (XGBoost + TF-IDF)
...

INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

The service will run on **http://localhost:8000**

## Step 3: Test the Health Endpoint

Open a new terminal and test the service:

```bash
# Check if service is running
curl http://localhost:8000/health

# Or use PowerShell (Windows)
Invoke-RestMethod -Uri http://localhost:8000/health -Method Get

# Or use a browser
# Navigate to: http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "online",
  "models_loaded": {
    "effort": true,
    "productivity": true,
    "schedule": true,
    "quality": true
  }
}
```

## Step 4: Test the 3-Engine Architecture Endpoint

### Using cURL

```bash
curl -X POST http://localhost:8000/assess-sprint-interruption \
  -H "Content-Type: application/json" \
  -d '{
    "new_ticket": {
      "id": "NEW-1",
      "title": "Critical bug fix in production",
      "story_points": 5.0,
      "priority": "Highest",
      "business_value": 90.0,
      "urgency": 95.0,
      "risk_penalty": 10.0,
      "description": "Production blocker - users cannot login",
      "ml_analysis": {
        "productivity_impact": 0.5
      }
    },
    "active_sprint": {
      "id": "SPRINT-1",
      "status": "active",
      "metrics": {
        "committedSP": 40.0
      }
    },
    "sprint_items": [
      {
        "id": "ITEM-1",
        "title": "Feature A - User Dashboard",
        "story_points": 8.0,
        "status": "To Do",
        "priority": "Medium",
        "business_value": 50.0,
        "urgency": 50.0,
        "risk_penalty": 0.0
      },
      {
        "id": "ITEM-2",
        "title": "Feature B - Reports",
        "story_points": 5.0,
        "status": "In Progress",
        "priority": "High",
        "business_value": 70.0,
        "urgency": 60.0,
        "risk_penalty": 5.0
      }
    ]
  }'
```

### Using PowerShell (Windows)

```powershell
$body = @{
    new_ticket = @{
        id = "NEW-1"
        title = "Critical bug fix in production"
        story_points = 5.0
        priority = "Highest"
        business_value = 90.0
        urgency = 95.0
        risk_penalty = 10.0
        description = "Production blocker - users cannot login"
        ml_analysis = @{
            productivity_impact = 0.5
        }
    }
    active_sprint = @{
        id = "SPRINT-1"
        status = "active"
        metrics = @{
            committedSP = 40.0
        }
    }
    sprint_items = @(
        @{
            id = "ITEM-1"
            title = "Feature A - User Dashboard"
            story_points = 8.0
            status = "To Do"
            priority = "Medium"
            business_value = 50.0
            urgency = 50.0
            risk_penalty = 0.0
        },
        @{
            id = "ITEM-2"
            title = "Feature B - Reports"
            story_points = 5.0
            status = "In Progress"
            priority = "High"
            business_value = 70.0
            urgency = 60.0
            risk_penalty = 5.0
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri http://localhost:8000/assess-sprint-interruption `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### Using Python

Create a test file `test_3engine.py`:

```python
import requests
import json

url = "http://localhost:8000/assess-sprint-interruption"

payload = {
    "new_ticket": {
        "id": "NEW-1",
        "title": "Critical bug fix in production",
        "story_points": 5.0,
        "priority": "Highest",
        "business_value": 90.0,
        "urgency": 95.0,
        "risk_penalty": 10.0,
        "description": "Production blocker - users cannot login",
        "ml_analysis": {
            "productivity_impact": 0.5
        }
    },
    "active_sprint": {
        "id": "SPRINT-1",
        "status": "active",
        "metrics": {
            "committedSP": 40.0
        }
    },
    "sprint_items": [
        {
            "id": "ITEM-1",
            "title": "Feature A - User Dashboard",
            "story_points": 8.0,
            "status": "To Do",
            "priority": "Medium",
            "business_value": 50.0,
            "urgency": 50.0,
            "risk_penalty": 0.0
        },
        {
            "id": "ITEM-2",
            "title": "Feature B - Reports",
            "story_points": 5.0,
            "status": "In Progress",
            "priority": "High",
            "business_value": 70.0,
            "urgency": 60.0,
            "risk_penalty": 5.0
        }
    ]
}

response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2))
```

Run it:
```bash
python test_3engine.py
```

## Expected Response

```json
{
  "action": "SWAP",
  "target_to_remove": "ITEM-1",
  "reasoning": "Value of new task (90.0) > Value of removed task (50.0) + Switch Cost (2.0). Net gain: 38.0. To Do items have lowest context-switch cost",
  "constraints_checked": [
    "Zero-Sum: Need to remove 5.0 SP",
    "WIP-Safety",
    "Context-Switching-Tax: Net value = 38.0",
    "All-Constraints-Satisfied"
  ],
  "new_item_value": 90.0,
  "removed_item_value": 50.0,
  "switch_cost": 2.0,
  "value_net": 38.0
}
```

## Step 5: Integration with Backend

The backend can call this endpoint from Node.js:

```javascript
// In backend/src/controllers/impact.controller.js or similar
const mlServiceClient = axios.create({
  baseURL: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  timeout: 15000,
});

// Call the 3-Engine Architecture endpoint
const response = await mlServiceClient.post('/assess-sprint-interruption', {
  new_ticket: {
    id: newTicket.id,
    title: newTicket.title,
    story_points: newTicket.storyPoints,
    priority: newTicket.priority,
    business_value: newTicket.businessValue || calculateFromPriority(newTicket.priority),
    urgency: newTicket.urgency || calculateFromPriority(newTicket.priority),
    risk_penalty: newTicket.riskPenalty || 0.0,
    description: newTicket.description || "",
    ml_analysis: {
      productivity_impact: mlAnalysis.productivity_impact || 0.0
    }
  },
  active_sprint: {
    id: sprint._id.toString(),
    status: sprint.status,
    metrics: {
      committedSP: sprint.metrics?.committedSP || 30.0
    }
  },
  sprint_items: sprintItems.map(item => ({
    id: item._id.toString(),
    title: item.title,
    story_points: item.storyPoints || 0,
    status: item.status,
    priority: item.priority,
    business_value: item.businessValue || calculateFromPriority(item.priority),
    urgency: item.urgency || calculateFromPriority(item.priority),
    risk_penalty: item.riskPenalty || 0.0
  }))
});

const recommendation = response.data;
```

## Testing Different Scenarios

### Scenario 1: Item Fits Without Removal (ACCEPT)

```json
{
  "new_ticket": {
    "story_points": 3.0,
    "priority": "Medium"
  },
  "active_sprint": {
    "metrics": {"committedSP": 40.0}
  },
  "sprint_items": [
    {"story_points": 30.0, "status": "To Do"}
  ]
}
```
**Expected:** `action: "ACCEPT"`

### Scenario 2: Value Not Worth Switch (DEFER)

```json
{
  "new_ticket": {
    "story_points": 8.0,
    "priority": "Low",
    "business_value": 30.0,
    "urgency": 20.0
  },
  "active_sprint": {
    "status": "active",
    "metrics": {"committedSP": 40.0}
  },
  "sprint_items": [
    {
      "story_points": 35.0,
      "status": "In Progress",
      "business_value": 80.0,
      "urgency": 70.0
    }
  ]
}
```
**Expected:** `action: "DEFER"` (value net < 0)

### Scenario 3: Critical Blocker (CRITICAL)

```json
{
  "new_ticket": {
    "story_points": 5.0,
    "priority": "Highest",
    "description": "Production down - critical blocker"
  },
  "active_sprint": {
    "status": "active",
    "metrics": {"committedSP": 40.0}
  },
  "sprint_items": [
    {"story_points": 38.0, "status": "In Progress"}
  ]
}
```
**Expected:** `action: "CRITICAL"`

## Troubleshooting

### Port Already in Use

If port 8000 is already in use:

```bash
# Change port in main.py line 512:
uvicorn.run(app, host="0.0.0.0", port=8001)  # Use different port

# Or set environment variable:
export PORT=8001
python main.py
```

### Import Errors

If you see import errors for `three_engine_architecture`:

```bash
# Make sure you're in the ml-service directory
cd ml-service

# Verify the file exists
ls three_engine_architecture.py  # macOS/Linux
dir three_engine_architecture.py  # Windows

# Check Python path
python -c "import sys; print(sys.path)"
```

### Models Not Loading

The service will still run even if models fail to load. Check the startup logs for model status. The 3-Engine Architecture endpoint doesn't require ML models to function (it uses rule-based logic).

## API Documentation

Once the service is running, you can view interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These will show all available endpoints including `/assess-sprint-interruption`.

## Next Steps

1. **Integrate with Backend**: Update your backend controllers to use the new endpoint
2. **Add Business Value/Urgency Fields**: Enhance your WorkItem model to store these values
3. **Test with Real Data**: Use actual sprint data from your database
4. **Tune Weights**: Adjust w1, w2, w3 weights based on your team's priorities

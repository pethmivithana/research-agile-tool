# 3-Engine Architecture Implementation

This document describes the theoretical, research-backed implementation of the Sprint Planning & Recommendation System.

> **Quick Start**: See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for step-by-step instructions on running and testing the system.

## Architecture Overview

The system consists of three engines:

1. **Backlog Engine** - Weighted Graph Logic with Selection Score
2. **Planning Engine** - Knapsack Optimization for Sprint Creation
3. **Recommendation Engine** - Dynamic Replanning Logic for Active Sprints

---

## 1. Backlog Engine (Weighted Graph Logic)

### Selection Score Formula

Each ticket gets a `Selection_Score (S)` calculated as:

$$S = (w_1 \times BusinessValue) + (w_2 \times Urgency) - (w_3 \times RiskPenalty)$$

**Default Weights:**
- $w_1 = 0.5$ (Business Value)
- $w_2 = 0.3$ (Urgency)
- $w_3 = 0.2$ (Risk Penalty)

**Dependency Penalty:**
- If a ticket depends on another ticket that is not "Done", the score is reduced by 30 points per unmet dependency.

### Usage

```python
from three_engine_architecture import BacklogEngine, TicketNode

# Create backlog engine
backlog = BacklogEngine()

# Add tickets
ticket = TicketNode(
    id="TICKET-1",
    title="Implement authentication",
    business_value=80.0,
    urgency=70.0,
    risk_penalty=20.0,
    story_points=5.0,
    dependencies=["TICKET-2"],  # Depends on TICKET-2
    status="backlog"
)
backlog.add_ticket(ticket)

# Get sorted backlog
sorted_backlog = backlog.get_sorted_backlog(status_filter="backlog")
# Returns: [(ticket_id, selection_score), ...] sorted by score descending
```

---

## 2. Planning Engine (Knapsack Optimization)

### Algorithm

Greedy Knapsack algorithm for sprint planning:

1. Sort backlog by Selection_Score (descending)
2. Iteratively add items that fit capacity
3. Skip items with unmet dependencies
4. Stop when capacity is filled or no more items fit

### Usage

```python
from three_engine_architecture import PlanningEngine

planning = PlanningEngine()

result = planning.plan_sprint(
    backlog_engine=backlog,
    capacity=40.0,  # Team velocity in story points
    exclude_tickets=["TICKET-ALREADY-ASSIGNED"]
)

# Returns:
# {
#     "selected_tickets": ["TICKET-1", "TICKET-3", ...],
#     "total_points": 38.0,
#     "remaining_capacity": 2.0,
#     "unmet_dependencies": ["TICKET-5"],
#     "selection_strategy": "greedy_knapsack_by_selection_score"
# }
```

---

## 3. Recommendation Engine (Dynamic Replanning)

### Constraints

#### A. Zero-Sum Rule
- **Logic:** Cannot add points to a full sprint without removing equal points
- **Equation:** `Points_In == Points_Out`

#### B. Context Switching Tax
- **Logic:** Swapping is not free. Calculate the cost of interrupting the team.
- **Validation Formula:**
  $$Value(New\_Req) > Value(Old\_Task) + Productivity\_Loss(Switching)$$
- **Action:** If the New Requirement's value does not cover the switching cost, recommend **DEFER**.

#### C. WIP Safety Rule
- **Logic:** Do not recommend pausing a task that is "In Progress" (Context switch cost is too high).
- **Priority:** When looking for a task to SWAP out, prioritize:
  1. "To Do" column first
  2. "In Review" column second
  3. "In Progress" column only if the New Requirement is a `Critical Blocker`

### Usage

#### Python (ML Service)

```python
from three_engine_architecture import assess_sprint_interruption

result = assess_sprint_interruption(
    new_ticket={
        "id": "NEW-1",
        "title": "Critical bug fix",
        "story_points": 5.0,
        "priority": "Highest",
        "business_value": 90.0,
        "urgency": 95.0,
        "risk_penalty": 10.0,
        "description": "Production blocker",
        "ml_analysis": {"productivity_impact": 0.5}
    },
    active_sprint={
        "id": "SPRINT-1",
        "status": "active",
        "metrics": {"committedSP": 40.0}
    },
    sprint_items=[
        {
            "id": "ITEM-1",
            "title": "Feature A",
            "story_points": 8.0,
            "status": "To Do",
            "priority": "Medium",
            "business_value": 50.0,
            "urgency": 50.0,
            "risk_penalty": 0.0
        },
        # ... more items
    ]
)

# Returns:
# {
#     "action": "SWAP" | "DEFER" | "SPLIT" | "CRITICAL",
#     "target_to_remove": "ITEM-1",
#     "reasoning": "Value of new task (90.0) > Value of removed task (50.0) + Switch Cost (2.0). Net gain: 38.0.",
#     "constraints_checked": ["Zero-Sum", "WIP-Safety", "Context-Switching-Tax"],
#     "new_item_value": 90.0,
#     "removed_item_value": 50.0,
#     "switch_cost": 2.0,
#     "value_net": 38.0
# }
```

#### API Endpoint

**POST** `/assess-sprint-interruption`

Request body:
```json
{
  "new_ticket": {
    "id": "NEW-1",
    "title": "Critical bug fix",
    "story_points": 5.0,
    "priority": "Highest",
    "business_value": 90.0,
    "urgency": 95.0,
    "risk_penalty": 10.0,
    "description": "Production blocker"
  },
  "active_sprint": {
    "id": "SPRINT-1",
    "status": "active",
    "metrics": {"committedSP": 40.0}
  },
  "sprint_items": [
    {
      "id": "ITEM-1",
      "title": "Feature A",
      "story_points": 8.0,
      "status": "To Do",
      "priority": "Medium"
    }
  ]
}
```

Response:
```json
{
  "action": "SWAP",
  "target_to_remove": "ITEM-1",
  "reasoning": "Value of new task (90.0) > Value of removed task (50.0) + Switch Cost (2.0). Net gain: 38.0.",
  "constraints_checked": ["Zero-Sum", "WIP-Safety", "Context-Switching-Tax"],
  "new_item_value": 90.0,
  "removed_item_value": 50.0,
  "switch_cost": 2.0,
  "value_net": 38.0
}
```

---

## Action Types

### SWAP
- **Condition:** New item value exceeds (removed item value + switch cost)
- **Result:** Remove target item, add new item
- **Constraints:** Zero-Sum satisfied, WIP Safety respected

### DEFER
- **Condition:** 
  - No viable swap candidates (all items in progress and not critical)
  - Value net gain is negative
  - Capacity unavailable and item not critical enough
- **Result:** Move new requirement to backlog for next sprint

### SPLIT
- **Condition:** Item is large (>= 8 SP) and can be divided
- **Result:** Add smaller part to current sprint, defer rest

### CRITICAL
- **Condition:** Critical blocker (Highest priority + blocker keywords)
- **Result:** Immediate escalation, override normal constraints

---

## Integration Notes

1. **Business Value/Urgency:** If not provided, defaults are calculated from priority:
   - Highest: 90
   - High: 70
   - Medium: 50
   - Low: 30
   - Lowest: 10

2. **Productivity Impact:** Should come from ML productivity model (days). If not provided, defaults to 0.0.

3. **Dependencies:** Currently tracked via `dependencies` list in TicketNode. Full graph traversal for dependency checking is implemented.

4. **Context Switching Cost:** Calculated as:
   - Base cost: 0.5 hours
   - Status cost: To Do (0h), In Review (1h), In Progress (3h)
   - WIP complexity: in_progress_count × 0.75h
   - Size multiplier: Large items (>=13 SP) × 1.5, Medium (>=8 SP) × 1.2
   - Active sprint multiplier: 1.5× if sprint is active
   - Productivity impact: productivity_impact_days × 8 hours

---

## Future Enhancements

1. **TF-IDF/Embedding Similarity:** Enhance `link_similar_tickets()` with actual text embeddings
2. **Dynamic Weight Tuning:** Allow weights (w1, w2, w3) to be configurable per project
3. **Multi-Item Swaps:** Enhanced logic for removing multiple items to fit large requirements
4. **Dependency Graph Visualization:** Add visualization tools for backlog graph

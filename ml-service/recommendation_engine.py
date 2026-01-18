"""
ROBUST RECOMMENDATION ENGINE
============================
Implements the "3-Engine Architecture" logic for Agile Sprint Replanning.
1. Productivity Engine: Calculates cost of context switching.
2. Planning Engine: Checks capacity constraints (Zero-Sum).
3. Decision Engine: Generates PRACTICAL actions (Swap, Split, Defer).
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass

@dataclass
class RecommendationResult:
    action: str  # SWAP, SPLIT, DEFER, ADD
    target_to_remove: Optional[Dict]
    reasoning: str
    impact_analysis: Dict[str, Any]
    action_plan: Dict[str, Any]

class RecommendationEngine:
    def __init__(self):
        # Configuration for "Practical" constraints
        self.MIN_DAYS_FOR_NEW_WORK = 2  # Don't add work if < 2 days left
        self.MAX_SP_FOR_SPLIT = 8       # If > 8 SP, suggest splitting
        self.CONTEXT_SWITCH_PENALTY = 0.2 # 20% penalty per switch

    def generate_recommendation(
        self, 
        new_ticket: Dict, 
        sprint_context: Dict, 
        active_items: List[Dict],
        ml_predictions: Dict
    ) -> Dict:
        """
        Main entry point. Orchestrates the decision logic.
        """
        # 1. Extract Context
        days_remaining = sprint_context.get("days_remaining", 10)
        current_load = sprint_context.get("sprint_load_7d", 0)
        capacity = sprint_context.get("team_capacity_hours", 120) / 6  # Convert hours to approx SP if needed (or use velocity)
        velocity = sprint_context.get("team_velocity_14d", 30)
        
        # Use Velocity as the real capacity limit if not provided explicitly
        real_capacity = velocity if velocity > 0 else 30
        
        # New Ticket Specs
        new_sp = new_ticket.get("story_points", 1)
        priority = new_ticket.get("priority", "Medium")

        # 2. Safety Checks (The "Common Sense" Layer)
        
        # CHECK A: Is it too late?
        if days_remaining < self.MIN_DAYS_FOR_NEW_WORK and priority != "Highest":
            return self._build_response(
                action="DEFER",
                reason=f"Sprint ends in {days_remaining:.1f} days. Too risky to add non-critical work.",
                impact={"schedule_risk": "Critical"}
            )

        # CHECK B: Is the ticket huge?
        if new_sp >= 13 and days_remaining < 10:
             return self._build_response(
                action="SPLIT",
                reason=f"Ticket size ({new_sp} SP) is too large for mid-sprint. Split required.",
                plan={"split_suggestion": f"Break into 'Analysis' ({int(new_sp*0.3)} SP) and 'Dev' ({int(new_sp*0.7)} SP)."}
            )

        # 3. Capacity Logic (The "Knapsack" Layer)
        free_space = real_capacity - current_load
        
        # SCENARIO: WE HAVE SPACE
        if free_space >= new_sp:
            return self._build_response(
                action="ADD",
                reason=f"Sprint has capacity (Free: {free_space:.1f} SP). Safe to add.",
                impact={"velocity_impact": "None"}
            )

        # SCENARIO: SPRINT IS FULL -> NEED TO SWAP (Zero-Sum)
        swap_candidate = self._find_swap_candidate(new_sp, active_items, priority)
        
        if swap_candidate:
            # Calculate Context Switch Cost
            switch_cost = self._calculate_switch_cost(swap_candidate)
            
            # Logic: Only swap if value gained > switch cost
            return self._build_response(
                action="SWAP",
                target=swap_candidate,
                reason=f"Sprint full. Swapping '{swap_candidate['title']}' ({swap_candidate['story_points']} SP) keeps capacity neutral.",
                impact={"productivity_cost": f"{switch_cost:.1f} Days lost to context switching"},
                plan={
                    "step_1": f"Move '{swap_candidate['title']}' to Backlog",
                    "step_2": f"Add '{new_ticket['title']}' to Active Sprint"
                }
            )

        # SCENARIO: NO GOOD SWAP FOUND -> DEFER
        return self._build_response(
            action="DEFER",
            reason=f"Sprint is full ({current_load}/{real_capacity} SP) and no suitable low-priority items found to swap.",
            impact={"schedule_risk": "High"}
        )

    def _find_swap_candidate(self, needed_sp: float, items: List[Dict], new_priority: str) -> Optional[Dict]:
        """
        Finds the 'cheapest' item to remove that frees up enough space.
        Rules:
        1. Must be 'To Do' (lowest switch cost).
        2. Must be lower priority than new ticket.
        3. Points must be >= needed_sp (or close to it).
        """
        # Sort items: Best candidates are Low Priority + To Do
        candidates = []
        
        priority_rank = {"Highest": 5, "High": 4, "Medium": 3, "Low": 2, "Lowest": 1}
        new_prio_rank = priority_rank.get(new_priority, 3)

        for item in items:
            # Rule: Don't swap completed items
            if item.get("status") in ["Done", "Completed"]:
                continue
            
            # Rule: Prefer 'To Do' over 'In Progress'
            status_penalty = 0 if item.get("status") == "To Do" else 100
            
            # Rule: Must be lower or equal priority
            item_prio = item.get("priority", "Medium")
            if priority_rank.get(item_prio, 3) > new_prio_rank:
                continue # Can't swap a High priority for a Medium one

            diff = abs(item.get("story_points", 0) - needed_sp)
            
            candidates.append({
                "item": item,
                "score": diff + status_penalty # Lower score is better
            })

        # Return best match
        if not candidates:
            return None
            
        candidates.sort(key=lambda x: x["score"])
        return candidates[0]["item"]

    def _calculate_switch_cost(self, item: Dict) -> float:
        """
        Simple productivity model for context switching.
        """
        if item.get("status") == "In Progress":
            return 2.5 # High cost to stop active work
        return 0.5 # Low cost (admin time) to move 'To Do' items

    def _build_response(self, action, reason, target=None, impact=None, plan=None):
        return {
            "recommendation_type": action,
            "reasoning": reason,
            "target_ticket": target,
            "impact_analysis": impact or {},
            "action_plan": plan or {}
        }

# Singleton instance for easy import
recommendation_engine = RecommendationEngine()

def get_recommendations(analysis_result, item_data, sprint_context):
    # Wrapper function to maintain compatibility with main.py calls
    # We need to construct a 'mock' list of active items if not provided, 
    # but ideally, this comes from the DB.
    
    # For simulation purposes in this demo:
    mock_active_items = [
        {"id": "T-101", "title": "Legacy API Update", "story_points": 8, "status": "In Progress", "priority": "High"},
        {"id": "T-102", "title": "Update Documentation", "story_points": 3, "status": "To Do", "priority": "Low"},
        {"id": "T-103", "title": "Fix CSS Grid", "story_points": 5, "status": "To Do", "priority": "Medium"},
        {"id": "T-104", "title": "Database Migration", "story_points": 13, "status": "In Progress", "priority": "Highest"},
    ]
    
    return recommendation_engine.generate_recommendation(
        new_ticket=item_data,
        sprint_context=sprint_context,
        active_items=mock_active_items, # Pass real DB items here in production
        ml_predictions=analysis_result
    )
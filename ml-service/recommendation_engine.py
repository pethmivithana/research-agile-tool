"""
=========================================================================================
RULE-BASED RECOMMENDATION ENGINE FOR MID-SPRINT IMPACT ANALYSIS
=========================================================================================

This is a PURE RULE-BASED system (NOT ML-based) that generates actionable recommendations
for Project Managers when analyzing mid-sprint requirement changes.

CORE DECISION RULES:
-------------------
1. REJECT RECOMMENDATION (Do Not Add to Sprint):
   - IF effort > 40 hours
   - AND schedule_risk > 80%
   - AND quality_risk > 70%
   - AND productivity_drop > 10%
   → Primary Recommendation: DEFER TO NEXT SPRINT

2. SPLIT STORY RECOMMENDATION:
   - IF effort > 40 hours OR schedule_risk > 70%
   → Recommend splitting into 2-3 smaller subtasks
   → Add Part 1 to current sprint, defer remaining parts

3. SWAP PRIORITY RECOMMENDATION:
   - IF 50% < schedule_risk < 80%
   - AND sprint has lower-priority items available
   → Remove low-priority items to make room
   → Add new critical requirement

4. ACCEPT WITH MITIGATION:
   - IF schedule_risk < 50%
   - AND quality_risk < 60%
   → Safe to add with standard precautions

THRESHOLDS (Rule Parameters):
-----------------------------
- Critical Effort Threshold: 40 hours
- High Schedule Risk: 70%+
- High Quality Risk: 60%+
- Significant Productivity Impact: 5+ days
- Capacity Safety Buffer: 80% utilization max

=========================================================================================
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import numpy as np

@dataclass
class SprintContext:
    """Context information about the current sprint"""
    sprint_id: str
    days_remaining: float
    team_capacity_hours: float  # Remaining developer hours
    current_velocity: float
    backlog_items: List[Dict[str, Any]]  # Current sprint items
    completed_story_points: float
    remaining_story_points: float

@dataclass
class RecommendationOption:
    """A single recommendation option with impact assessment"""
    id: str
    type: str
    title: str
    description: str
    action: str
    severity: str  # critical, high, medium, low
    priority: int  # 1 = highest priority
    
    # Impact estimates after applying this option
    estimated_schedule_risk: float
    estimated_productivity_impact: float
    estimated_quality_risk: float
    
    # Detailed action steps
    action_steps: List[str]
    
    # Sub-tasks (for split option)
    sub_tasks: Optional[List[Dict[str, Any]]] = None
    
    # Items affected (for swap option)
    affected_items: Optional[List[Dict[str, Any]]] = None

class RecommendationEngine:
    """
    =====================================================================================
    RULE-BASED RECOMMENDATION SYSTEM
    =====================================================================================
    
    This engine uses explicit rules and thresholds (NOT machine learning) to generate
    recommendations based on the ML model predictions.
    
    The ML models provide:
    - Effort estimates (hours)
    - Schedule risk probability (0-1)
    - Quality risk probability (0-1)
    - Productivity impact (days)
    
    This engine applies BUSINESS RULES to those predictions to generate actionable
    recommendations for Project Managers.
    =====================================================================================
    """
    
    def __init__(self):
        self.rules = self._initialize_rules()
    
    def _initialize_rules(self) -> Dict:
        """
        Initialize decision thresholds for the RULE-BASED system.
        
        These thresholds define when different recommendations are triggered.
        Adjust these values to tune recommendation sensitivity.
        """
        return {
            # RULE 1: When to recommend REJECTING the requirement
            "critical_effort_threshold": 40,  # hours - tasks over 40h are too large
            "high_schedule_risk_threshold": 0.7,  # 70% - high spillover probability
            "high_quality_risk_threshold": 0.6,  # 60% - high defect probability
            "significant_productivity_impact": 5,  # days - major velocity impact
            
            # RULE 2: Capacity management
            "capacity_buffer": 0.8,  # Use 80% of capacity for safety margin
            
            # RULE 3: When to suggest splitting
            "split_effort_threshold": 40,  # Split stories over 40 hours
            "split_risk_threshold": 0.7,  # Split if schedule risk > 70%
            
            # RULE 4: When to suggest swapping
            "swap_min_risk": 0.5,  # Only swap if risk is moderate (50-80%)
            "swap_max_risk": 0.8,
        }
    
    def generate_recommendations(
        self,
        analysis_result: Dict[str, Any],
        new_item_data: Dict[str, Any],
        sprint_context: Optional[SprintContext] = None
    ) -> Dict[str, Any]:
        """
        =====================================================================================
        MAIN RECOMMENDATION GENERATION FUNCTION
        =====================================================================================
        
        Applies RULE-BASED logic to ML predictions to generate actionable recommendations.
        
        Input:
            - analysis_result: ML model predictions (effort, schedule risk, quality risk, etc.)
            - new_item_data: Details about the new requirement
            - sprint_context: Current sprint state (optional)
        
        Output:
            - decision: "reject" | "accept_with_caution" | "requires_action"
            - primary_recommendation: The top recommended option
            - alternative_options: Other viable options
            - risk_summary: Overall risk assessment
        
        RULE APPLICATION ORDER:
        1. Assess overall risk level using rule thresholds
        2. Generate all applicable recommendation options
        3. Rank options by priority based on risk level
        4. Return structured recommendation response
        =====================================================================================
        """
        
        # Extract metrics from ML predictions
        predicted_hours = analysis_result.get("predicted_hours", 0)
        quality_prob = analysis_result.get("quality_risk_probability", 0)
        prod_impact = analysis_result.get("productivity_impact", 0)
        schedule_prob = analysis_result.get("schedule_risk_probability", 0)
        
        # STEP 1: Rule-based risk assessment
        risk_summary = self._assess_overall_risk(
            predicted_hours, schedule_prob, quality_prob, prod_impact
        )
        
        # STEP 2: Generate recommendation options using rules
        options = []
        
        # RULE: Split Story if effort is too high OR schedule risk is high
        if (predicted_hours > self.rules["split_effort_threshold"] or 
            schedule_prob > self.rules["split_risk_threshold"]):
            options.append(self._generate_split_option(
                new_item_data, predicted_hours, schedule_prob, quality_prob
            ))
        
        # RULE: Swap Lower Priority Items if risk is moderate and sprint context exists
        if (self.rules["swap_min_risk"] < schedule_prob < self.rules["swap_max_risk"] 
            and sprint_context):
            swap_option = self._generate_swap_option(
                new_item_data, sprint_context, predicted_hours, schedule_prob
            )
            if swap_option:
                options.append(swap_option)
        
        # RULE: Always offer "Move to Next Sprint" as safest option
        options.append(self._generate_defer_option(
            new_item_data, predicted_hours, schedule_prob, quality_prob
        ))
        
        # RULE: Accept with Mitigations if risk is low enough
        if (schedule_prob < self.rules["swap_min_risk"] and 
            quality_prob < self.rules["high_quality_risk_threshold"]):
            options.append(self._generate_accept_option(
                new_item_data, predicted_hours, quality_prob, prod_impact
            ))
        
        # STEP 3: Sort by priority (rule-based ranking)
        options.sort(key=lambda x: x.priority)
        
        # STEP 4: Make final decision using rules
        decision = self._make_decision(schedule_prob, predicted_hours, sprint_context)
        
        return {
            "decision": decision,
            "primary_recommendation": self._to_dict(options[0]) if options else None,
            "alternative_options": [self._to_dict(opt) for opt in options[1:]],
            "risk_summary": risk_summary,
            "models_used": {
                "effort": analysis_result.get("model_evidence", {}).get("schedule", False),
                "schedule": True,
                "productivity": True,
                "quality": True
            }
        }
    
    def _assess_overall_risk(self, effort: float, schedule: float, quality: float, productivity: float) -> Dict:
        """
        RULE-BASED RISK SCORING SYSTEM
        
        Calculates a risk score by applying weighted rules to each metric:
        - Effort: +3 points if > 40h, +1 if > 20h
        - Schedule Risk: +4 if > 80%, +2 if > 60%, +1 if > 40%
        - Quality Risk: +3 if > 70%, +1 if > 50%
        - Productivity: +2 if > 5 days, +1 if > 3 days
        
        Final Risk Level (Rule-Based):
        - CRITICAL: 8+ points
        - HIGH: 5-7 points
        - MEDIUM: 3-4 points
        - LOW: 0-2 points
        """
        risk_score = 0
        
        # RULE: Effort contribution to risk
        if effort > 40: 
            risk_score += 3
        elif effort > 20: 
            risk_score += 1
        
        # RULE: Schedule risk contribution
        if schedule > 0.8: 
            risk_score += 4
        elif schedule > 0.6: 
            risk_score += 2
        elif schedule > 0.4: 
            risk_score += 1
        
        # RULE: Quality risk contribution
        if quality > 0.7: 
            risk_score += 3
        elif quality > 0.5: 
            risk_score += 1
        
        # RULE: Productivity impact contribution
        if productivity > 5: 
            risk_score += 2
        elif productivity > 3: 
            risk_score += 1
        
        # RULE: Convert score to risk level
        if risk_score >= 8:
            level = "CRITICAL"
            color = "red"
        elif risk_score >= 5:
            level = "HIGH"
            color = "orange"
        elif risk_score >= 3:
            level = "MEDIUM"
            color = "yellow"
        else:
            level = "LOW"
            color = "green"
        
        return {
            "level": level,
            "score": risk_score,
            "color": color,
            "summary": self._get_risk_summary(level, effort, schedule)
        }
    
    def _get_risk_summary(self, level: str, effort: float, schedule: float) -> str:
        """Generate human-readable risk summary based on rule-determined level"""
        if level == "CRITICAL":
            return f"CRITICAL RISK: Task requires {effort:.0f}h with {schedule*100:.0f}% spillover probability. Sprint goal is in danger."
        elif level == "HIGH":
            return f"HIGH RISK: Significant chance of delays. Careful planning required."
        elif level == "MEDIUM":
            return f"MODERATE RISK: Manageable with proper mitigation strategies."
        else:
            return f"LOW RISK: Task fits well within sprint constraints."
    
    def _generate_split_option(self, item: Dict, effort: float, schedule: float, quality: float) -> RecommendationOption:
        """
        RULE: SPLIT STORY RECOMMENDATION
        
        Triggered when:
        - Effort > 40 hours OR Schedule Risk > 70%
        
        Logic:
        - Split into 2-3 subtasks based on effort magnitude
        - Assign Part 1 to current sprint
        - Defer remaining parts to backlog
        - Reduces risk by limiting scope
        """
        story_points = item.get("story_points", 1)
        
        # RULE: Determine number of splits based on effort
        num_splits = 3 if effort > 60 else 2
        subtask_points = story_points / num_splits
        
        sub_tasks = [
            {
                "title": f"{item.get('title', 'Task')} - Part {i+1}",
                "story_points": round(subtask_points, 1),
                "sprint": "Current" if i == 0 else "Next",
                "estimated_hours": round(effort / num_splits, 1)
            }
            for i in range(num_splits)
        ]
        
        # RULE: Calculate reduced risks after split
        new_effort = effort / num_splits
        new_schedule_risk = schedule * 0.2  # 80% risk reduction
        new_quality_risk = quality * 0.6  # 40% risk reduction
        
        return RecommendationOption(
            id="OPTION_SPLIT",
            type="split_story",
            title="Split Story into Multiple Parts",
            description=f"Break this {story_points}-point story into {num_splits} smaller tasks. Complete Part 1 in current sprint ({sub_tasks[0]['estimated_hours']:.0f}h), defer remaining parts.",
            action="Split into Subtasks",
            severity="high" if schedule > 0.8 else "medium",
            priority=1 if schedule > 0.8 else 2,
            estimated_schedule_risk=new_schedule_risk,
            estimated_productivity_impact=effort / num_splits / 8,
            estimated_quality_risk=new_quality_risk,
            action_steps=[
                f"Create {num_splits} subtasks from the original requirement",
                f"Assign Part 1 ({sub_tasks[0]['story_points']} pts) to current sprint",
                f"Move remaining parts to product backlog for next sprint",
                "Update sprint commitment and notify stakeholders"
            ],
            sub_tasks=sub_tasks
        )
    
    def _generate_swap_option(self, item: Dict, sprint_context: SprintContext, effort: float, schedule: float) -> Optional[RecommendationOption]:
        """
        RULE: SWAP LOWER PRIORITY ITEMS
        
        Triggered when:
        - 50% < Schedule Risk < 80% (moderate risk)
        - Sprint has lower priority items available
        
        Logic:
        - Identify low/medium priority items in sprint
        - Remove them to make capacity available
        - Add new critical requirement
        - Moderate risk reduction
        """
        if not sprint_context or not sprint_context.backlog_items:
            return None
        
        # RULE: Find swappable items (low/medium priority, not in progress)
        swappable = [
            bi for bi in sprint_context.backlog_items
            if bi.get("priority") in ["Low", "Lowest", "Medium"]
            and bi.get("status") not in ["Done", "In Progress"]
        ]
        
        if not swappable:
            return None
        
        # RULE: Select items to swap (match story points)
        target_points = item.get("story_points", 1)
        affected = []
        accumulated_points = 0
        
        for swap_item in sorted(swappable, key=lambda x: x.get("story_points", 0)):
            if accumulated_points >= target_points:
                break
            affected.append(swap_item)
            accumulated_points += swap_item.get("story_points", 0)
        
        if not affected:
            return None
        
        # RULE: Calculate reduced risk after swap
        new_schedule_risk = schedule * 0.5  # 50% risk reduction
        
        return RecommendationOption(
            id="OPTION_SWAP",
            type="swap_priority",
            title="Swap with Lower Priority Items",
            description=f"Remove {len(affected)} lower-priority item(s) ({accumulated_points:.0f} pts total) and add this critical requirement instead.",
            action="Swap Sprint Items",
            severity="medium",
            priority=2,
            estimated_schedule_risk=new_schedule_risk,
            estimated_productivity_impact=effort / 16,
            estimated_quality_risk=schedule * 0.6,
            action_steps=[
                f"Move {len(affected)} low-priority items to backlog: {', '.join([a['title'] for a in affected[:3]])}",
                "Add new critical requirement to sprint",
                "Notify affected stakeholders about priority change",
                "Re-balance team assignments"
            ],
            affected_items=affected
        )
    
    def _generate_defer_option(self, item: Dict, effort: float, schedule: float, quality: float) -> RecommendationOption:
        """
        RULE: DEFER TO NEXT SPRINT (Always Available)
        
        This is ALWAYS an option and is the SAFEST choice.
        
        Logic:
        - Zero impact on current sprint
        - Preserve sprint goals and team velocity
        - Highest priority when risk is CRITICAL
        """
        return RecommendationOption(
            id="OPTION_DEFER",
            type="defer_to_next_sprint",
            title="Move to Next Sprint",
            description="Defer this requirement to the next sprint to preserve current sprint goals and team velocity. Safest option with zero current sprint risk.",
            action="Move to Backlog",
            severity="low",
            priority=3 if schedule < 0.7 else 1,  # RULE: Top priority if high risk
            estimated_schedule_risk=0.0,
            estimated_productivity_impact=0.0,
            estimated_quality_risk=0.0,
            action_steps=[
                "Add requirement to product backlog with high priority",
                "Schedule for next sprint planning",
                "Communicate timeline change to stakeholders",
                "Keep current sprint commitment intact"
            ]
        )
    
    def _generate_accept_option(self, item: Dict, effort: float, quality: float, productivity: float) -> RecommendationOption:
        """
        RULE: ACCEPT WITH MITIGATIONS
        
        Triggered when:
        - Schedule Risk < 50%
        - Quality Risk < 60%
        
        Logic:
        - Risk is manageable with precautions
        - Apply standard mitigation strategies
        - Monitor progress closely
        """
        mitigations = []
        
        # RULE: Determine required mitigations based on metrics
        if effort > 20:
            mitigations.append("Assign senior developer or enable pair programming")
        if quality > 0.4:
            mitigations.append("Allocate 20% extra time for code review and testing")
        if productivity > 2:
            mitigations.append("Reduce meeting overhead and protect focus time")
        
        if not mitigations:
            mitigations.append("Follow standard development practices")
        
        return RecommendationOption(
            id="OPTION_ACCEPT",
            type="accept_with_mitigation",
            title="Accept with Risk Mitigations",
            description="Add to current sprint with additional safeguards and monitoring. Risk is manageable with proper precautions.",
            action="Add to Sprint",
            severity="low",
            priority=4,
            estimated_schedule_risk=0.3,
            estimated_productivity_impact=productivity,
            estimated_quality_risk=quality,
            action_steps=mitigations + [
                "Add to sprint backlog and assign to team",
                "Schedule daily check-ins to monitor progress"
            ]
        )
    
    def _make_decision(self, schedule_risk: float, effort: float, sprint_context: Optional[SprintContext]) -> str:
        """
        RULE-BASED FINAL DECISION
        
        Rules:
        - REJECT if schedule_risk > 80% OR effort > 60h
        - REQUIRES_ACTION if schedule_risk > 50% OR effort > 30h
        - ACCEPT_WITH_CAUTION otherwise
        """
        if schedule_risk > 0.8 or effort > 60:
            return "reject"
        elif schedule_risk > 0.5 or effort > 30:
            return "requires_action"
        else:
            return "accept_with_caution"
    
    def _to_dict(self, option: RecommendationOption) -> Dict:
        """Convert RecommendationOption to dictionary for API response"""
        return {
            "id": option.id,
            "type": option.type,
            "title": option.title,
            "description": option.description,
            "action": option.action,
            "severity": option.severity,
            "priority": option.priority,
            "impact": {
                "schedule_risk": f"{option.estimated_schedule_risk*100:.0f}%",
                "productivity_impact": f"{option.estimated_productivity_impact:.1f} days",
                "quality_risk": f"{option.estimated_quality_risk*100:.0f}%"
            },
            "action_steps": option.action_steps,
            "sub_tasks": option.sub_tasks,
            "affected_items": option.affected_items
        }

# =====================================================================================
# GLOBAL INSTANCE
# =====================================================================================
recommendation_engine = RecommendationEngine()

def get_recommendations(analysis_result: Dict[str, Any], item_data: Dict[str, Any], sprint_context: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Main function to generate RULE-BASED recommendations
    
    This function is called by the FastAPI endpoint and applies PURE RULE-BASED logic
    (not machine learning) to the ML model predictions.
    """
    # Convert sprint_context dict to SprintContext if provided
    ctx = None
    if sprint_context:
        ctx = SprintContext(
            sprint_id=sprint_context.get("sprint_id", ""),
            days_remaining=sprint_context.get("days_remaining", 10.0),
            team_capacity_hours=sprint_context.get("team_capacity_hours", 120.0),
            current_velocity=sprint_context.get("current_velocity", 30.0),
            backlog_items=sprint_context.get("backlog_items", []),
            completed_story_points=sprint_context.get("completed_story_points", 0.0),
            remaining_story_points=sprint_context.get("remaining_story_points", 30.0)
        )
    
    return recommendation_engine.generate_recommendations(analysis_result, item_data, ctx)

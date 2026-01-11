"""
RULE-BASED RECOMMENDATION ENGINE FOR AGILE IMPACT ANALYSIS

This module applies pure rule-based logic (not ML) on top of DL model predictions
to generate smart, context-aware recommendations for mid-sprint requirement changes.

Architecture:
- SprintContext: Calculates sprint metrics (effort_ratio, story_point_ratio, remaining days)
- RulesEngine: Applies business rules to ML predictions
- RecommendationOption: Structured recommendation with action steps
- get_recommendations(): Main entry point for FastAPI
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Any, Optional
from datetime import datetime
from sprint_context import SprintContextEngine

# ======================================================================================
# DATA MODELS
# ======================================================================================

@dataclass
class SprintContext:
    """Sprint state information for context-aware recommendations"""
    sprint_id: str
    days_remaining: float
    team_capacity_hours: float
    current_velocity: float
    backlog_items: List[Dict] = None
    completed_story_points: float = 0.0
    remaining_story_points: float = 30.0
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    durationDays: Optional[int] = None
    numberOfDevelopers: Optional[int] = None
    hoursPerDayPerDeveloper: Optional[int] = None

@dataclass
class RecommendationOption:
    """Structured recommendation with action steps"""
    id: str
    title: str
    type: str  # split_story, swap_priority, defer_to_next_sprint, accept_with_mitigation
    description: str
    severity: str  # critical, high, medium, low
    priority: int  # Lower = higher priority (for sorting)
    action_steps: List[str]
    impact: Optional[Dict[str, str]] = None

    def to_dict(self) -> Dict:
        return asdict(self)

# ======================================================================================
# RULES ENGINE
# ======================================================================================

class RecommendationEngine:
    """
    RULE-BASED recommendation engine that applies pure business logic
    to ML model predictions within sprint context.
    """

    def __init__(self):
        self.rules = self._initialize_rules()

    def _initialize_rules(self) -> Dict:
        """Initialize decision thresholds for the rule-based system."""
        return {
            # Effort thresholds (in hours)
            "critical_effort_threshold": 50,
            "high_effort_threshold": 30,
            "medium_effort_threshold": 15,
            
            # Schedule risk thresholds (0-1 probability)
            "critical_schedule_threshold": 0.75,
            "high_schedule_threshold": 0.55,
            "moderate_schedule_threshold": 0.35,
            
            # Quality risk thresholds
            "high_quality_threshold": 0.70,
            "moderate_quality_threshold": 0.40,
            
            # Productivity impact threshold (days)
            "significant_productivity_impact": 0.10,  # 10% drop
            
            # Ratio thresholds (context-aware)
            "effort_ratio_critical": 0.6,
            "effort_ratio_high": 0.4,
            "effort_ratio_moderate": 0.25,
            "sp_ratio_critical": 0.9,
            "sp_ratio_high": 0.6,
        }

    def generate_recommendations(
        self,
        analysis_result: Dict[str, Any],
        item_data: Dict[str, Any],
        sprint_context: Optional[SprintContext] = None
    ) -> Dict[str, Any]:
        """
        Generate context-aware recommendations using rule-based logic.
        
        DECISION LOGIC:
        1. Extract ML predictions
        2. Calculate sprint context metrics (effort_ratio, sp_ratio, phase)
        3. Apply context-aware rules to adjust risk levels
        4. Generate recommendation options
        5. Select primary recommendation and alternatives
        """
        
        # Extract ML predictions
        predicted_hours = analysis_result.get("predicted_hours", 0)
        schedule_prob = analysis_result.get("schedule_risk_probability", 0)
        quality_prob = analysis_result.get("quality_risk_probability", 0)
        productivity_impact = analysis_result.get("productivity_impact", 0)
        priority = item_data.get("priority", "Medium")
        story_points = item_data.get("story_points", 5)

        # Calculate sprint context metrics if available
        effort_ratio = 0
        sp_ratio = 0
        sprint_phase = "unknown"
        adjusted_schedule_risk = schedule_prob
        adjusted_quality_risk = quality_prob

        if sprint_context:
            # Use SprintContextEngine for calculations
            ctx_engine = SprintContextEngine({
                'startDate': sprint_context.startDate,
                'endDate': sprint_context.endDate,
                'durationDays': sprint_context.durationDays,
                'numberOfDevelopers': sprint_context.numberOfDevelopers,
                'hoursPerDayPerDeveloper': sprint_context.hoursPerDayPerDeveloper,
                'metrics': {
                    'committedSP': sprint_context.remaining_story_points,
                    'prevSprintVelocity': sprint_context.current_velocity,
                }
            })
            
            effort_ratio = ctx_engine.calculate_effort_ratio(predicted_hours)
            sp_ratio = ctx_engine.calculate_story_point_ratio(story_points)
            sprint_phase = ctx_engine.get_sprint_phase()

            # Apply context-aware rules to adjust risk
            # Rule 1: Small tasks mid-sprint downgrade schedule risk
            if effort_ratio < 0.25 and sprint_phase in ['early', 'mid']:
                adjusted_schedule_risk = max(0, schedule_prob - 0.3)

            # Rule 2: Late sprint + significant effort = escalate risk
            if sprint_phase == 'late' and effort_ratio > 0.3:
                adjusted_schedule_risk = min(1, schedule_prob + 0.2)

            # Rule 3: Critical priority + late sprint = increase quality risk
            if priority.lower() in ['critical', 'highest'] and sprint_phase == 'late':
                adjusted_quality_risk = min(1, quality_prob + 0.25)

        # Step 1: Assess overall risk
        risk_summary = self._assess_overall_risk(
            predicted_hours, adjusted_schedule_risk, adjusted_quality_risk, productivity_impact, effort_ratio
        )

        # Step 2: Generate recommendation options
        options = self._generate_options(
            item_data, predicted_hours, adjusted_schedule_risk, adjusted_quality_risk,
            productivity_impact, effort_ratio, sprint_context, sprint_phase
        )

        # Step 3: Determine primary recommendation
        primary = options[0] if options else None
        alternatives = options[1:] if len(options) > 1 else []

        # Step 4: Determine decision
        decision = self._make_decision(risk_summary['level'], adjusted_schedule_risk, predicted_hours, effort_ratio)

        return {
            "decision": decision,
            "primary_recommendation": primary.to_dict() if primary else None,
            "alternative_options": [opt.to_dict() for opt in alternatives],
            "risk_summary": risk_summary,
            "context_metrics": {
                "effort_ratio": round(effort_ratio, 2),
                "sp_ratio": round(sp_ratio, 2),
                "sprint_phase": sprint_phase,
                "adjusted_schedule_risk": round(adjusted_schedule_risk, 2),
                "adjusted_quality_risk": round(adjusted_quality_risk, 2),
            } if sprint_context else {}
        }

    def _assess_overall_risk(
        self, effort: float, schedule: float, quality: float, productivity: float, effort_ratio: float = 0
    ) -> Dict[str, Any]:
        """
        Rule-based risk assessment with context awareness.
        Returns: {level, score, explanation}
        """
        risk_score = 0

        # Effort scoring (context-aware with effort_ratio)
        if effort > self.rules["critical_effort_threshold"] or effort_ratio > 0.6:
            risk_score += 4
        elif effort > self.rules["high_effort_threshold"] or effort_ratio > 0.4:
            risk_score += 2
        elif effort > self.rules["medium_effort_threshold"]:
            risk_score += 1

        # Schedule risk scoring
        if schedule >= self.rules["critical_schedule_threshold"]:
            risk_score += 4
        elif schedule >= self.rules["high_schedule_threshold"]:
            risk_score += 2
        elif schedule >= self.rules["moderate_schedule_threshold"]:
            risk_score += 1

        # Quality risk scoring
        if quality >= self.rules["high_quality_threshold"]:
            risk_score += 3
        elif quality >= self.rules["moderate_quality_threshold"]:
            risk_score += 1

        # Productivity impact scoring
        if productivity > 0.1:
            risk_score += 2

        # Determine risk level
        if risk_score >= 10:
            level = "Critical"
            explanation = f"CRITICAL RISK: Task requires {effort:.0f}h ({effort_ratio:.0%} of capacity) with {schedule*100:.0f}% spillover probability. Sprint goal is endangered."
        elif risk_score >= 6:
            level = "High"
            explanation = f"HIGH RISK: Significant probability of delays. Careful planning and mitigation required."
        elif risk_score >= 3:
            level = "Moderate"
            explanation = f"MODERATE RISK: Manageable with proper prioritization and mitigation strategies."
        else:
            level = "Low"
            explanation = f"LOW RISK: Task fits well within remaining sprint capacity."

        return {
            "level": level,
            "score": risk_score,
            "summary": explanation
        }

    def _generate_options(
        self, item: Dict, effort: float, schedule: float, quality: float, productivity: float,
        effort_ratio: float, sprint_context: Optional[SprintContext], sprint_phase: str
    ) -> List[RecommendationOption]:
        """Generate ordered list of recommendation options."""
        options = []

        # Option 1: Split Story - for large or high-risk tasks
        if effort > self.rules["high_effort_threshold"] or schedule > self.rules["high_schedule_threshold"]:
            options.append(RecommendationOption(
                id="split_story",
                title="Split into Multiple Parts",
                type="split_story",
                description=f"Break this {effort:.0f}h task into smaller, incrementally deliverable components to reduce risk.",
                severity="high" if schedule > 0.55 else "medium",
                priority=1 if schedule > 0.7 else 2,
                impact={
                    "schedule_risk": "Medium",
                    "productivity_impact": "Low",
                    "quality_risk": "Low"
                },
                action_steps=[
                    f"Identify core MVP component (estimate ~{int(effort*0.3)}h effort)",
                    "Add MVP to current sprint",
                    "Defer remaining enhancements to backlog"
                ]
            ))

        # Option 2: Swap Priority - for moderate risk with backlog available
        if (self.rules["moderate_schedule_threshold"] < schedule < self.rules["critical_schedule_threshold"]
            and sprint_context and sprint_context.backlog_items):
            options.append(RecommendationOption(
                id="swap_priority",
                title="Swap with Lower-Priority Item",
                type="swap_priority",
                description="Move lower-priority backlog items out to make room for this critical requirement.",
                severity="medium",
                priority=2,
                action_steps=[
                    "Identify 1-2 lower-priority items in sprint",
                    "Move them to product backlog",
                    "Add this task to current sprint"
                ]
            ))

        # Option 3: Accept with Mitigation - for low/moderate risk
        if schedule < self.rules["critical_schedule_threshold"] and quality < self.rules["high_quality_threshold"]:
            mitigations = []
            if quality > self.rules["moderate_quality_threshold"]:
                mitigations.append("Schedule extra code review time")
            if effort > self.rules["medium_effort_threshold"]:
                mitigations.append("Plan for incremental testing")
            
            options.append(RecommendationOption(
                id="accept",
                title="Accept and Add to Sprint",
                type="accept_with_mitigation",
                description=f"This task is manageable within current sprint. Proceed with mitigations.",
                severity="low" if schedule < 0.35 else "medium",
                priority=1 if schedule < 0.35 else 3,
                impact={
                    "schedule_risk": "Low" if schedule < 0.35 else "Moderate",
                    "productivity_impact": "Low",
                    "quality_risk": "Low" if quality < 0.40 else "Moderate"
                },
                action_steps=[
                    "Add to current sprint backlog",
                    "Assign to available developer",
                    *mitigations,
                    "Track daily in standups"
                ]
            ))

        # Option 4: Defer - always available as safest option
        options.append(RecommendationOption(
            id="defer",
            title="Defer to Next Sprint",
            type="defer_to_next_sprint",
            description="Move this task to the next sprint when more capacity is available. Safest approach.",
            severity="low",
            priority=4,
            action_steps=[
                "Move to product backlog",
                "Prioritize for next sprint planning",
                "Communicate timeline to stakeholder"
            ]
        ))

        # Sort by priority (lower number = higher priority)
        options.sort(key=lambda x: x.priority)
        return options

    def _make_decision(self, risk_level: str, schedule_risk: float, effort: float, effort_ratio: float) -> str:
        """Determine final decision based on risk assessment."""
        if risk_level == "Critical" and effort_ratio > 0.5:
            return "REJECT"
        elif risk_level in ["Critical", "High"]:
            return "REQUIRES_ACTION"
        else:
            return "ACCEPT"

# ======================================================================================
# SINGLETON INSTANCE & ENTRY POINT
# ======================================================================================

recommendation_engine = RecommendationEngine()

def get_recommendations(
    analysis_result: Dict[str, Any],
    item_data: Dict[str, Any],
    sprint_context: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Main entry point for FastAPI /recommendations/generate endpoint.
    
    Converts dict sprint_context to SprintContext dataclass and calls engine.
    """
    ctx = None
    if sprint_context:
        ctx = SprintContext(
            sprint_id=sprint_context.get("sprint_id", ""),
            days_remaining=sprint_context.get("days_remaining", 10.0),
            team_capacity_hours=sprint_context.get("team_capacity_hours", 120.0),
            current_velocity=sprint_context.get("current_velocity", 30.0),
            backlog_items=sprint_context.get("backlog_items", []),
            completed_story_points=sprint_context.get("completed_story_points", 0.0),
            remaining_story_points=sprint_context.get("remaining_story_points", 30.0),
            startDate=sprint_context.get("startDate"),
            endDate=sprint_context.get("endDate"),
            durationDays=sprint_context.get("durationDays"),
            numberOfDevelopers=sprint_context.get("numberOfDevelopers"),
            hoursPerDayPerDeveloper=sprint_context.get("hoursPerDayPerDeveloper"),
        )

    return recommendation_engine.generate_recommendations(analysis_result, item_data, ctx)

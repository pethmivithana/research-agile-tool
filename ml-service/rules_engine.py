"""
Context-Aware Rule-Based Decision Layer

This engine applies ML predictions within sprint context to generate
intelligent recommendations that account for current sprint state.

Rules prevent false "Critical" warnings for small mid-sprint additions
by evaluating effort_ratio and remaining sprint capacity.
"""

from typing import Dict, List, Any, Tuple
from sprint_context import SprintContextEngine

class RulesEngine:
    """
    Applies business rules on top of ML predictions.
    Uses effort_ratio, story_point_ratio, and sprint phase to adjust risk levels.
    """
    
    def __init__(self, ml_results: Dict, sprint_context: Dict):
        self.ml_results = ml_results
        self.context_engine = SprintContextEngine(sprint_context)
        self.context_metrics = self.context_engine.calculate_metrics()
        
    def evaluate_schedule_risk(self) -> Dict[str, Any]:
        """
        Evaluate schedule risk with context awareness.
        Prevents false Critical warnings by checking effort_ratio.
        """
        ml_prob = self.ml_results.get('schedule_risk_probability', 0.5)
        predicted_hours = self.ml_results.get('predicted_hours', 0)
        
        # Calculate ratios
        effort_ratio = self.context_engine.calculate_effort_ratio(predicted_hours)
        sprint_phase = self.context_engine.get_sprint_phase()
        remaining_days = self.context_metrics['remaining_sprint_days']
        
        # Apply rules
        adjusted_prob = ml_prob
        
        # Rule 1: Small tasks mid-sprint should not be Critical
        if effort_ratio < 0.25:
            adjusted_prob = max(0, ml_prob - 0.3)  # Downgrade by 30%
        
        # Rule 2: Tasks in late sprint phase increase risk
        if sprint_phase == 'late' and effort_ratio > 0.3:
            adjusted_prob = min(1, ml_prob + 0.2)  # Increase by 20%
        
        # Rule 3: No days remaining = Critical
        if remaining_days < 1:
            adjusted_prob = 1.0
        
        # Rule 4: Large tasks always carry high risk
        if effort_ratio > 0.6:
            adjusted_prob = min(1, adjusted_prob + 0.25)
        
        # Convert to risk level
        risk_level = self._probability_to_risk_level(adjusted_prob, 'schedule')
        
        return {
            'ml_probability': ml_prob,
            'adjusted_probability': adjusted_prob,
            'effort_ratio': effort_ratio,
            'sprint_phase': sprint_phase,
            'risk_level': risk_level,
            'explanation': self._generate_schedule_explanation(adjusted_prob, effort_ratio, sprint_phase)
        }
    
    def evaluate_quality_risk(self) -> Dict[str, Any]:
        """
        Evaluate quality risk with context awareness.
        """
        ml_prob = self.ml_results.get('quality_risk_probability', 0.4)
        priority = self.ml_results.get('priority', 'Medium')
        predicted_hours = self.ml_results.get('predicted_hours', 0)
        
        effort_ratio = self.context_engine.calculate_effort_ratio(predicted_hours)
        sprint_phase = self.context_engine.get_sprint_phase()
        
        adjusted_prob = ml_prob
        
        # Rule 1: Critical priority in late sprint = higher quality risk
        if priority.lower() in ['critical', 'highest'] and sprint_phase == 'late':
            adjusted_prob = min(1, ml_prob + 0.3)
        
        # Rule 2: Large effort + late sprint = higher quality risk
        if effort_ratio > 0.5 and sprint_phase != 'early':
            adjusted_prob = min(1, adjusted_prob + 0.25)
        
        # Rule 3: Small, simple tasks have minimal quality risk
        if effort_ratio < 0.15 and predicted_hours < 8:
            adjusted_prob = max(0, ml_prob - 0.25)
        
        risk_level = self._probability_to_risk_level(adjusted_prob, 'quality')
        
        return {
            'ml_probability': ml_prob,
            'adjusted_probability': adjusted_prob,
            'sprint_phase': sprint_phase,
            'risk_level': risk_level,
            'explanation': self._generate_quality_explanation(adjusted_prob, effort_ratio, sprint_phase)
        }
    
    def make_recommendation(self) -> Dict[str, Any]:
        """
        Make recommendation based on ML + context rules.
        
        REJECT only if:
        - Schedule Risk = Critical
        - AND effort_ratio > 0.5
        - AND productivity_impact > 10%
        """
        schedule_eval = self.evaluate_schedule_risk()
        quality_eval = self.evaluate_quality_risk()
        
        schedule_risk = schedule_eval['risk_level']
        effort_ratio = schedule_eval['effort_ratio']
        productivity_drop = self.ml_results.get('productivity_impact', 0)
        
        # Decision logic
        should_reject = (
            schedule_risk == 'Critical'
            and effort_ratio > 0.5
            and productivity_drop > 0.1
        )
        
        if should_reject:
            return {
                'decision': 'REJECT',
                'primary_recommendation': {
                    'id': 'reject_critical',
                    'title': 'Defer to Next Sprint',
                    'type': 'defer_to_next_sprint',
                    'description': 'This task introduces critical risk to the current sprint. Recommend deferring to the next sprint when capacity is available.',
                    'severity': 'critical',
                    'action_steps': [
                        'Move task to product backlog',
                        'Schedule for next sprint planning',
                        'Communicate delay to stakeholder'
                    ]
                },
                'alternative_options': [
                    {
                        'id': 'split_story_critical',
                        'title': 'Split into Smaller Parts',
                        'type': 'split_story',
                        'description': 'Break this into smaller, lower-risk tasks that fit within sprint capacity.',
                        'severity': 'high',
                        'action_steps': [
                            'Identify core MVP component',
                            'Plan phased delivery',
                            'Deliver critical part now, rest later'
                        ]
                    }
                ],
                'reasoning': f"Critical schedule risk (effort_ratio={effort_ratio:.2f}) with significant productivity impact"
            }
        
        # Generate options based on risk levels
        return self._generate_options(schedule_risk, quality_eval['risk_level'], effort_ratio)
    
    def _probability_to_risk_level(self, probability: float, risk_type: str) -> str:
        """Convert probability (0-1) to risk level."""
        if risk_type == 'schedule':
            if probability >= 0.75:
                return 'Critical'
            elif probability >= 0.55:
                return 'High'
            elif probability >= 0.35:
                return 'Moderate'
            else:
                return 'Low'
        else:  # quality
            if probability >= 0.70:
                return 'High'
            elif probability >= 0.40:
                return 'Moderate'
            else:
                return 'Low'
    
    def _generate_schedule_explanation(self, prob: float, effort_ratio: float, sprint_phase: str) -> str:
        """Generate human-readable explanation for schedule risk."""
        if prob >= 0.75:
            if effort_ratio > 0.6:
                return f"Task requires {effort_ratio:.0%} of remaining capacity. High likelihood of sprint spillover."
            return "Critical risk detected: insufficient time or resources to complete within sprint."
        
        if prob >= 0.55:
            return f"Significant effort required ({effort_ratio:.0%} of capacity). May need priority adjustments."
        
        if prob >= 0.35:
            return f"Moderate effort ({effort_ratio:.0%} of capacity). Manageable with proper planning."
        
        return "Fits well within remaining sprint capacity and timeline."
    
    def _generate_quality_explanation(self, prob: float, effort_ratio: float, sprint_phase: str) -> str:
        """Generate human-readable explanation for quality risk."""
        if prob >= 0.70:
            if effort_ratio > 0.5:
                return "Complex task with high effort. Heavy risk of defects. Extra code review and testing recommended."
            return "Complexity risk detected. Ensure robust testing and peer review."
        
        if prob >= 0.40:
            return "Moderate complexity. Standard QA processes should be sufficient."
        
        return "Low-complexity task. Minimal quality risk with standard testing."
    
    def _generate_options(self, schedule_risk: str, quality_risk: str, effort_ratio: float) -> Dict:
        """Generate recommendation options based on risk levels."""
        options = []
        primary = None
        
        # Primary recommendation based on schedule risk
        if schedule_risk == 'Critical':
            primary = {
                'id': 'split_critical',
                'title': 'Split into Multiple Parts',
                'type': 'split_story',
                'description': 'Break this large task into smaller, incrementally deliverable components.',
                'severity': 'critical',
                'impact': {
                    'schedule_risk': 'High',
                    'productivity_impact': 'Medium',
                    'quality_risk': 'Moderate'
                },
                'action_steps': [
                    'Identify core MVP (30% effort)',
                    'Add to current sprint',
                    'Defer enhancements to next sprint'
                ]
            }
        elif schedule_risk == 'High':
            primary = {
                'id': 'swap_priority',
                'title': 'Swap with Lower-Priority Backlog Item',
                'type': 'swap_priority',
                'description': 'Replace a lower-priority story with this one by moving less critical items to backlog.',
                'severity': 'high',
                'impact': {
                    'schedule_risk': 'Moderate',
                    'productivity_impact': 'Low',
                    'quality_risk': 'Low'
                },
                'action_steps': [
                    'Identify lower-priority items in sprint',
                    'Move to backlog',
                    'Add this task to current sprint'
                ]
            }
        else:
            primary = {
                'id': 'accept',
                'title': 'Accept and Add to Sprint',
                'type': 'accept_with_mitigation',
                'description': 'This task fits within current sprint. Add to sprint backlog.',
                'severity': 'low',
                'impact': {
                    'schedule_risk': schedule_risk,
                    'productivity_impact': 'Low',
                    'quality_risk': quality_risk
                },
                'action_steps': [
                    'Add to current sprint',
                    'Assign to available developer',
                    'Track in daily standups'
                ]
            }
        
        # Alternative options
        if schedule_risk in ['High', 'Critical'] and effort_ratio > 0.3:
            options.append({
                'id': 'defer',
                'title': 'Defer to Next Sprint',
                'type': 'defer_to_next_sprint',
                'description': 'Move this task to the next sprint when more capacity is available.',
                'severity': 'medium',
                'action_steps': [
                    'Add to product backlog',
                    'Prioritize for next sprint',
                    'Communicate timeline to stakeholder'
                ]
            })
        
        return {
            'decision': 'ACCEPT',
            'primary_recommendation': primary,
            'alternative_options': options,
            'reasoning': f"Schedule risk: {schedule_risk}, Quality risk: {quality_risk}, Effort ratio: {effort_ratio:.2%}"
        }

from datetime import datetime, timedelta
from typing import Dict, List, Any

class SprintContextEngine:
    """
    Calculates sprint context metrics for rule-based decision making.
    Provides feature engineering on top of ML predictions.
    """
    
    def __init__(self, sprint_data: Dict):
        self.sprint_data = sprint_data
        self.today = datetime.now()
        
    def calculate_metrics(self) -> Dict[str, Any]:
        """
        Calculate all sprint context metrics.
        Returns dict with effort_ratio, story_point_ratio, days_remaining, etc.
        """
        start_date = self._parse_date(self.sprint_data.get('startDate'))
        end_date = self._parse_date(self.sprint_data.get('endDate'))
        
        current_day = (self.today - start_date).days if start_date else 0
        duration_days = (end_date - start_date).days if start_date and end_date else 14
        remaining_days = max(0.5, (end_date - self.today).days if end_date else 14)
        
        # Team capacity calculation
        num_devs = self.sprint_data.get('numberOfDevelopers', 5)
        hours_per_dev_per_day = self.sprint_data.get('hoursPerDayPerDeveloper', 6)
        total_capacity_hours = num_devs * hours_per_dev_per_day * remaining_days
        
        # Velocity metrics
        current_committed_sp = self.sprint_data.get('metrics', {}).get('committedSP', 0)
        prev_velocity = self.sprint_data.get('metrics', {}).get('prevSprintVelocity', 30)
        remaining_velocity = max(1, prev_velocity - current_committed_sp)
        
        return {
            'current_sprint_day': current_day,
            'remaining_sprint_days': remaining_days,
            'total_duration_days': duration_days,
            'total_capacity_hours': total_capacity_hours,
            'remaining_velocity_sp': remaining_velocity,
            'current_committed_sp': current_committed_sp,
            'team_size': num_devs,
            'hours_per_day_per_dev': hours_per_dev_per_day,
        }
    
    def calculate_effort_ratio(self, predicted_hours: float) -> float:
        """
        effort_ratio = predicted_effort / remaining_capacity_hours
        
        Interpretation:
        - < 0.25: Very small, minimal impact
        - 0.25-0.5: Moderate, manageable
        - 0.5-0.75: Large, significant impact
        - > 0.75: Very large, critical risk
        """
        metrics = self.calculate_metrics()
        remaining_capacity = metrics['total_capacity_hours']
        if remaining_capacity <= 0:
            return 1.0  # At capacity
        return predicted_hours / remaining_capacity
    
    def calculate_story_point_ratio(self, story_points: int) -> float:
        """
        story_point_ratio = task_story_points / remaining_velocity
        
        Interpretation:
        - < 0.3: Small, fits easily
        - 0.3-0.6: Medium, doable
        - 0.6-0.9: Large, risky
        - > 0.9: Very large, critical
        """
        metrics = self.calculate_metrics()
        remaining_vel = metrics['remaining_velocity_sp']
        if remaining_vel <= 0:
            return 1.0  # No velocity left
        return story_points / remaining_vel
    
    def get_sprint_phase(self) -> str:
        """
        Determine which phase of sprint we're in.
        """
        metrics = self.calculate_metrics()
        progress_pct = 100 * (1 - metrics['remaining_sprint_days'] / max(1, metrics['total_duration_days']))
        
        if progress_pct < 33:
            return 'early'
        elif progress_pct < 66:
            return 'mid'
        else:
            return 'late'
    
    @staticmethod
    def _parse_date(date_str):
        """Helper to parse ISO date string."""
        if not date_str:
            return None
        if isinstance(date_str, str):
            try:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                return None
        return date_str

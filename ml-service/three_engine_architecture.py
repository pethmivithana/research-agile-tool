"""
3-Engine Architecture for Sprint Planning & Recommendation System
Based on theoretical, research-backed approaches:
1. Backlog Engine (Weighted Graph Logic)
2. Planning Engine (Knapsack Optimization)
3. Recommendation Engine (Dynamic Replanning Logic)
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import math


# ======================================================================================
# 1. BACKLOG ENGINE (Weighted Graph Logic)
# ======================================================================================

@dataclass
class TicketNode:
    """Represents a ticket in the backlog graph"""
    id: str
    title: str
    business_value: float  # 0-100 scale
    urgency: float  # 0-100 scale
    risk_penalty: float  # 0-100 scale (higher = more risk)
    story_points: float
    dependencies: List[str]  # List of ticket IDs this depends on
    status: str  # "backlog", "in_sprint", "done"
    
    # Selection Score weights (default values, can be tuned)
    w1_business_value: float = 0.5
    w2_urgency: float = 0.3
    w3_risk_penalty: float = 0.2
    
    def calculate_selection_score(self, dependency_graph: Dict[str, 'TicketNode']) -> float:
        """
        Calculate Selection Score: S = (w1 * BusinessValue) + (w2 * Urgency) - (w3 * RiskPenalty)
        
        Also applies dependency penalty if dependencies are not "Done"
        """
        base_score = (
            self.w1_business_value * self.business_value +
            self.w2_urgency * self.urgency -
            self.w3_risk_penalty * self.risk_penalty
        )
        
        # Dependency penalty: reduce score if dependencies aren't done
        dependency_penalty = 0.0
        for dep_id in self.dependencies:
            dep_ticket = dependency_graph.get(dep_id)
            if dep_ticket and dep_ticket.status != "done":
                dependency_penalty += 30.0  # Significant penalty per unmet dependency
        
        final_score = base_score - dependency_penalty
        return max(0.0, final_score)  # Ensure non-negative


class BacklogEngine:
    """
    Manages backlog as a weighted graph.
    Tracks dependencies and calculates Selection Scores.
    """
    
    def __init__(self):
        self.tickets: Dict[str, TicketNode] = {}
        self.similarity_threshold = 0.7  # For linking similar tickets
    
    def add_ticket(self, ticket: TicketNode):
        """Add a ticket to the backlog graph"""
        self.tickets[ticket.id] = ticket
    
    def calculate_all_scores(self) -> Dict[str, float]:
        """Calculate Selection Scores for all tickets"""
        scores = {}
        for ticket_id, ticket in self.tickets.items():
            scores[ticket_id] = ticket.calculate_selection_score(self.tickets)
        return scores
    
    def get_sorted_backlog(self, status_filter: Optional[str] = "backlog") -> List[Tuple[str, float]]:
        """
        Get backlog items sorted by Selection Score (descending)
        Returns: List of (ticket_id, selection_score) tuples
        """
        scores = self.calculate_all_scores()
        filtered = {
            tid: score for tid, score in scores.items()
            if status_filter is None or self.tickets[tid].status == status_filter
        }
        return sorted(filtered.items(), key=lambda x: x[1], reverse=True)
    
    def link_similar_tickets(self, new_ticket: TicketNode, similarity_threshold: float = 0.7):
        """
        Use TF-IDF or embedding similarity to link new requirements to existing tickets.
        For now, uses simple text-based similarity (can be enhanced with TF-IDF/embeddings)
        """
        # Simple implementation - can be enhanced with actual TF-IDF
        new_title_words = set(new_ticket.title.lower().split())
        
        for ticket_id, existing_ticket in self.tickets.items():
            if existing_ticket.id == new_ticket.id:
                continue
            
            existing_title_words = set(existing_ticket.title.lower().split())
            
            # Calculate Jaccard similarity
            intersection = len(new_title_words & existing_title_words)
            union = len(new_title_words | existing_title_words)
            similarity = intersection / union if union > 0 else 0.0
            
            if similarity >= similarity_threshold:
                # Link tickets (could create dependency or just mark as related)
                # For simplicity, we'll just note similarity
                pass  # In full implementation, would create graph edges


# ======================================================================================
# 2. PLANNING ENGINE (Knapsack Optimization)
# ======================================================================================

class PlanningEngine:
    """
    Implements Knapsack Optimization for sprint planning.
    Greedily selects items with highest Selection_Score that fit capacity.
    Respects dependency constraints.
    """
    
    def plan_sprint(
        self,
        backlog_engine: BacklogEngine,
        capacity: float,  # Team velocity in story points
        exclude_tickets: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Greedy Knapsack algorithm for sprint planning.
        
        Algorithm:
        1. Sort backlog by Selection_Score (descending)
        2. Iteratively add items that fit capacity
        3. Skip items with unmet dependencies
        4. Stop when capacity is filled or no more items fit
        
        Returns: {
            "selected_tickets": List[ticket_ids],
            "total_points": float,
            "remaining_capacity": float,
            "unmet_dependencies": List[ticket_ids]
        }
        """
        exclude_tickets = exclude_tickets or []
        
        # Get sorted backlog (excluding already assigned tickets)
        sorted_backlog = backlog_engine.get_sorted_backlog(status_filter="backlog")
        
        selected_tickets = []
        total_points = 0.0
        unmet_dependencies = []
        
        for ticket_id, selection_score in sorted_backlog:
            if ticket_id in exclude_tickets:
                continue
            
            ticket = backlog_engine.tickets[ticket_id]
            
            # Check if item fits capacity
            if total_points + ticket.story_points > capacity:
                continue  # Skip if doesn't fit
            
            # Check dependencies
            dependencies_met = True
            for dep_id in ticket.dependencies:
                dep_ticket = backlog_engine.tickets.get(dep_id)
                if dep_ticket and dep_ticket.status != "done":
                    dependencies_met = False
                    if ticket_id not in unmet_dependencies:
                        unmet_dependencies.append(ticket_id)
                    break
            
            if not dependencies_met:
                continue  # Skip if dependencies not met
            
            # Add to sprint
            selected_tickets.append(ticket_id)
            total_points += ticket.story_points
        
        return {
            "selected_tickets": selected_tickets,
            "total_points": total_points,
            "remaining_capacity": capacity - total_points,
            "unmet_dependencies": unmet_dependencies,
            "selection_strategy": "greedy_knapsack_by_selection_score"
        }


# ======================================================================================
# 3. RECOMMENDATION ENGINE (Dynamic Replanning Logic)
# ======================================================================================

@dataclass
class SprintInterruptionResult:
    """Result of sprint interruption assessment"""
    action: str  # "SWAP", "DEFER", "SPLIT", "CRITICAL"
    target_to_remove: Optional[str]  # ticket_id if SWAP
    reasoning: str
    constraints_checked: List[str]
    new_item_value: Optional[float] = None
    removed_item_value: Optional[float] = None
    switch_cost: Optional[float] = None
    value_net: Optional[float] = None  # new_value - (removed_value + switch_cost)


class RecommendationEngine:
    """
    Dynamic replanning logic for active sprint interruptions.
    Implements strict constraints: Zero-Sum, Context Switching Tax, WIP Safety
    """
    
    def assess_sprint_interruption(
        self,
        new_ticket: Dict[str, Any],
        active_sprint: Dict[str, Any],
        sprint_items: List[Dict[str, Any]],
        productivity_model: Optional[Dict[str, Any]] = None,
        backlog_engine: Optional[BacklogEngine] = None
    ) -> SprintInterruptionResult:
        """
        Core function: Assess sprint interruption and recommend action.
        
        Constraints Applied:
        A. Zero-Sum Rule: Points_In == Points_Out
        B. Context Switching Tax: Value(New) > Value(Old) + Switching_Cost
        C. WIP Safety: Prioritize "To Do" > "In Review" > "In Progress"
        
        Args:
            new_ticket: {
                "id": str,
                "title": str,
                "story_points": float,
                "priority": str,
                "business_value": float,
                "urgency": float,
                "risk_penalty": float
            }
            active_sprint: {
                "id": str,
                "metrics": {"committedSP": float},
                "status": str
            }
            sprint_items: List of work items in current sprint
            productivity_model: ML productivity impact (days)
            backlog_engine: Optional backlog engine for value calculations
        
        Returns:
            SprintInterruptionResult with action recommendation
        """
        
        constraints_checked = []
        new_points = new_ticket.get("story_points", 0)
        new_priority = new_ticket.get("priority", "Medium")
        is_critical_blocker = new_priority == "Highest" and self._is_blocker(new_ticket)
        
        # Calculate new ticket value (from Selection Score formula)
        new_value = self._calculate_ticket_value(new_ticket)
        
        # Sprint capacity metrics
        sprint_capacity = active_sprint.get("metrics", {}).get("committedSP", 30.0)
        current_points = sum(item.get("story_points", 0) for item in sprint_items)
        remaining_capacity = sprint_capacity - current_points
        
        # ===== CONSTRAINT A: Zero-Sum Rule Check =====
        if new_points <= remaining_capacity:
            constraints_checked.append("Zero-Sum: Fits without removal")
            return SprintInterruptionResult(
                action="ACCEPT",
                target_to_remove=None,
                reasoning=f"New requirement ({new_points} SP) fits within remaining capacity ({remaining_capacity:.1f} SP). No rebalancing needed.",
                constraints_checked=constraints_checked
            )
        
        # Need to remove items - calculate points deficit
        points_deficit = new_points - remaining_capacity
        constraints_checked.append(f"Zero-Sum: Need to remove {points_deficit:.1f} SP")
        
        # ===== CONSTRAINT C: WIP Safety - Find optimal swap candidate =====
        swap_candidate = self._find_optimal_swap_candidate(
            sprint_items, 
            is_critical_blocker,
            points_deficit
        )
        
        if not swap_candidate:
            constraints_checked.append("WIP-Safety: No viable swap candidates")
            return SprintInterruptionResult(
                action="DEFER",
                target_to_remove=None,
                reasoning=f"No items available for swap. Sprint is locked (all items in progress). Defer to next sprint.",
                constraints_checked=constraints_checked
            )
        
        removed_item = swap_candidate["item"]
        removed_points = removed_item.get("story_points", 0)
        removed_value = self._calculate_ticket_value(removed_item)
        
        # Check if swap candidate provides enough points
        total_removed_points = swap_candidate.get("total_removed_points", removed_points)
        if total_removed_points < points_deficit:
            # Need to remove multiple items or split
            if new_points > 8:  # Large item, consider SPLIT
                constraints_checked.append("Split-Feasibility: Large item can be split")
                return SprintInterruptionResult(
                    action="SPLIT",
                    target_to_remove=None,
                    reasoning=f"Item is large ({new_points} SP). Split into parts: {remaining_capacity:.1f} SP now, {new_points - remaining_capacity:.1f} SP later.",
                    constraints_checked=constraints_checked
                )
            else:
                # Try to find multiple swap candidates
                multiple_candidates = self._find_multiple_swap_candidates(
                    sprint_items, is_critical_blocker, points_deficit
                )
                if multiple_candidates:
                    constraints_checked.append("Zero-Sum: Multiple items for swap")
                    # Continue with multiple candidate logic (simplified for now)
                    return SprintInterruptionResult(
                        action="DEFER",
                        target_to_remove=None,
                        reasoning="Would require removing multiple items. Complexity too high. Defer to next sprint.",
                        constraints_checked=constraints_checked
                    )
        
        # ===== CONSTRAINT B: Context Switching Tax =====
        productivity_impact = productivity_model.get("productivity_impact", 0.0) if productivity_model else 0.0
        switch_cost = self._calculate_context_switching_cost(
            removed_item, 
            active_sprint.get("status") == "active",
            len([i for i in sprint_items if i.get("status") == "In Progress"]),
            productivity_impact
        )
        
        # Value comparison: New Value > (Removed Value + Switch Cost)
        switch_cost_value = self._convert_cost_to_value(switch_cost)
        value_net = new_value - (removed_value + switch_cost_value)
        
        constraints_checked.append(f"Context-Switching-Tax: Net value = {value_net:.1f}")
        
        if value_net <= 0:
            # Switching cost exceeds benefit
            return SprintInterruptionResult(
                action="DEFER",
                target_to_remove=None,
                reasoning=f"Value of new task ({new_value:.1f}) does not exceed value of removed task ({removed_value:.1f}) + switch cost ({switch_cost_value:.1f}). Net: {value_net:.1f}. Defer to next sprint.",
                constraints_checked=constraints_checked,
                new_item_value=new_value,
                removed_item_value=removed_value,
                switch_cost=switch_cost_value,
                value_net=value_net
            )
        
        # ===== CRITICAL BLOCKER Check =====
        if is_critical_blocker:
            constraints_checked.append("Critical-Path-Detection")
            return SprintInterruptionResult(
                action="CRITICAL",
                target_to_remove=removed_item.get("id"),
                reasoning=f"CRITICAL BLOCKER: Immediate escalation required. Value justifies swap: {value_net:.1f} net gain.",
                constraints_checked=constraints_checked,
                new_item_value=new_value,
                removed_item_value=removed_value,
                switch_cost=switch_cost_value,
                value_net=value_net
            )
        
        # ===== SWAP Recommendation =====
        constraints_checked.append("All-Constraints-Satisfied")
        return SprintInterruptionResult(
            action="SWAP",
            target_to_remove=removed_item.get("id"),
            reasoning=f"Value of new task ({new_value:.1f}) > Value of removed task ({removed_value:.1f}) + Switch Cost ({switch_cost_value:.1f}). Net gain: {value_net:.1f}. {swap_candidate['reason']}",
            constraints_checked=constraints_checked,
            new_item_value=new_value,
            removed_item_value=removed_value,
            switch_cost=switch_cost_value,
            value_net=value_net
        )
    
    def _calculate_ticket_value(self, ticket: Dict[str, Any]) -> float:
        """Calculate ticket value using Selection Score formula"""
        business_value = ticket.get("business_value", 50.0)
        urgency = ticket.get("urgency", 50.0)
        risk_penalty = ticket.get("risk_penalty", 0.0)
        
        # Default weights (can be tuned)
        w1, w2, w3 = 0.5, 0.3, 0.2
        
        # Priority multiplier for urgency
        priority_map = {"Highest": 90, "High": 70, "Medium": 50, "Low": 30, "Lowest": 10}
        priority_urgency = priority_map.get(ticket.get("priority", "Medium"), 50)
        effective_urgency = max(urgency, priority_urgency * 0.8)  # Blend with priority
        
        value = (w1 * business_value) + (w2 * effective_urgency) - (w3 * risk_penalty)
        return max(0.0, value)
    
    def _calculate_context_switching_cost(
        self,
        work_item: Dict[str, Any],
        is_active_sprint: bool,
        in_progress_count: int,
        productivity_impact_days: float
    ) -> float:
        """
        Calculate context switching cost in hours.
        Formula: Base Cost + Status Factor + WIP Complexity + Productivity Impact
        """
        base_cost_hours = 0.5
        
        # Status-based cost
        status = work_item.get("status", "To Do")
        status_cost = {
            "To Do": 0.0,
            "In Review": 1.0,
            "In Progress": 3.0,  # Highest cost
        }.get(status, 1.5)
        
        # WIP complexity
        wip_cost = in_progress_count * 0.75
        
        # Item size factor
        item_points = work_item.get("story_points", 0)
        size_multiplier = 1.0
        if item_points >= 13:
            size_multiplier = 1.5
        elif item_points >= 8:
            size_multiplier = 1.2
        
        # Active sprint multiplier
        active_multiplier = 1.5 if is_active_sprint else 1.0
        
        total_hours = (
            (base_cost_hours + status_cost + wip_cost) * size_multiplier * active_multiplier +
            productivity_impact_days * 8.0  # Convert days to hours
        )
        
        return total_hours
    
    def _convert_cost_to_value(self, cost_hours: float) -> float:
        """Convert hours of switching cost to value units (simplified conversion)"""
        # Rough conversion: 1 hour = 2 value points (can be tuned)
        return cost_hours * 2.0
    
    def _find_optimal_swap_candidate(
        self,
        sprint_items: List[Dict[str, Any]],
        is_critical: bool,
        points_needed: float
    ) -> Optional[Dict[str, Any]]:
        """
        Find optimal swap candidate following WIP Safety Rule.
        Priority: To Do > In Review > In Progress (only if critical)
        """
        # Group by status
        by_status = {
            "To Do": [],
            "In Review": [],
            "In Progress": []
        }
        
        for item in sprint_items:
            status = item.get("status", "To Do")
            if status in by_status:
                by_status[status].append(item)
        
        # Sort each group by story points (ascending - remove smaller items first if possible)
        for status in by_status:
            by_status[status].sort(key=lambda x: x.get("story_points", 0))
        
        # Priority order: To Do first
        if by_status["To Do"]:
            candidate = by_status["To Do"][0]
            return {
                "item": candidate,
                "reason": "To Do items have lowest context-switch cost",
                "total_removed_points": candidate.get("story_points", 0)
            }
        
        # Then In Review
        if by_status["In Review"]:
            candidate = by_status["In Review"][0]
            return {
                "item": candidate,
                "reason": "In Review items are easier to defer than In Progress",
                "total_removed_points": candidate.get("story_points", 0)
            }
        
        # Only consider In Progress if critical blocker
        if is_critical and by_status["In Progress"]:
            candidate = by_status["In Progress"][0]
            return {
                "item": candidate,
                "reason": "Only considering In Progress for critical blocker requirements",
                "total_removed_points": candidate.get("story_points", 0)
            }
        
        return None
    
    def _find_multiple_swap_candidates(
        self,
        sprint_items: List[Dict[str, Any]],
        is_critical: bool,
        points_needed: float
    ) -> Optional[List[Dict[str, Any]]]:
        """Find multiple candidates if single item doesn't provide enough points"""
        candidates = []
        total_points = 0.0
        
        # Use same priority order as single candidate
        by_status = {"To Do": [], "In Review": [], "In Progress": []}
        for item in sprint_items:
            status = item.get("status", "To Do")
            if status in by_status:
                by_status[status].append(item)
        
        for status in ["To Do", "In Review"]:
            if status == "In Progress" and not is_critical:
                continue
            
            for item in sorted(by_status[status], key=lambda x: x.get("story_points", 0)):
                if total_points >= points_needed:
                    break
                candidates.append(item)
                total_points += item.get("story_points", 0)
            
            if total_points >= points_needed:
                break
        
        return candidates if total_points >= points_needed else None
    
    def _is_blocker(self, ticket: Dict[str, Any]) -> bool:
        """Check if ticket is a blocker (production issue, critical path)"""
        description = ticket.get("description", "").lower()
        title = ticket.get("title", "").lower()
        text = f"{title} {description}"
        
        blocker_keywords = ["blocker", "critical", "urgent", "production", "down", "broken", "p0"]
        return any(keyword in text for keyword in blocker_keywords)


# ======================================================================================
# HELPER FUNCTIONS FOR API INTEGRATION
# ======================================================================================

def assess_sprint_interruption(new_ticket: Dict, active_sprint: Dict, sprint_items: List[Dict]) -> Dict:
    """
    Main entry point function for assess_sprint_interruption.
    Converts to/from dataclasses for API compatibility.
    
    Returns JSON-serializable recommendation.
    """
    engine = RecommendationEngine()
    
    result = engine.assess_sprint_interruption(
        new_ticket=new_ticket,
        active_sprint=active_sprint,
        sprint_items=sprint_items,
        productivity_model=new_ticket.get("ml_analysis", {}),
        backlog_engine=None  # Optional - can be passed if available
    )
    
    # Convert to dict
    return {
        "action": result.action,
        "target_to_remove": result.target_to_remove,
        "reasoning": result.reasoning,
        "constraints_checked": result.constraints_checked,
        "new_item_value": result.new_item_value,
        "removed_item_value": result.removed_item_value,
        "switch_cost": result.switch_cost,
        "value_net": result.value_net
    }

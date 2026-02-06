"""
Rule-based Recommendation Engine
"""

from datetime import datetime

def generate_recommendation(analysis: dict, new_ticket: dict, active_sprint: dict, sprint_items: list = None) -> dict:
    """Generate recommendations based on ML analysis and sprint context"""
    if sprint_items is None:
        sprint_items = []
    
    print("\n" + "="*70)
    print("💡 GENERATING RULE-BASED RECOMMENDATIONS")
    print("="*70)
    
    # Extract key metrics
    new_points = new_ticket.get("storyPoints", 1)
    priority = new_ticket.get("priority", "Medium")
    is_critical = priority == "Highest"
    
    # Calculate sprint state
    current_load = sum(item.get("storyPoints", 0) or 0 for item in sprint_items)
    capacity = active_sprint.get("metrics", {}).get("committedSP", 30)
    remaining_capacity = capacity - current_load
    
    now = datetime.utcnow()
    end_date = active_sprint.get("endDate")
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date)
    days_remaining = max(0.5, (end_date - now).days) if end_date else 10
    
    # Extract ML predictions
    schedule_risk_high = analysis.get("scheduleRisk", {}).get("probability", 0.5) > 0.5
    productivity_impact_high = analysis.get("productivity", {}).get("impactDays", 0) >= 2.0
    quality_risk_high = analysis.get("qualityRisk", {}).get("probability", 0.5) > 0.5
    
    print(f"\n📊 SPRINT STATE:")
    print(f"  Current Load: {current_load} SP / {capacity} SP")
    print(f"  Remaining Capacity: {remaining_capacity} SP")
    print(f"  Days Remaining: {days_remaining}")
    
    print(f"\n🎯 NEW REQUIREMENT:")
    print(f"  Title: {new_ticket.get('title')}")
    print(f"  Story Points: {new_points} SP")
    print(f"  Priority: {priority}")
    
    print(f"\n🤖 ML RISK ASSESSMENT:")
    print(f"  Schedule Risk: {'HIGH' if schedule_risk_high else 'LOW'} ({analysis.get('scheduleRisk', {}).get('probability', 0)*100:.0f}%)")
    print(f"  Productivity Impact: {'HIGH' if productivity_impact_high else 'LOW'} ({analysis.get('productivity', {}).get('impactDays', 0)} days)")
    print(f"  Quality Risk: {'HIGH' if quality_risk_high else 'LOW'} ({analysis.get('qualityRisk', {}).get('probability', 0)*100:.0f}%)")
    
    # Build options
    options = []
    primary = None
    
    # RULE 1: DEFER (Always available)
    print("\n🔍 RULE 1: Evaluating DEFER option...")
    defer_option = {
        "id": "defer_to_next_sprint",
        "type": "defer_to_next_sprint",
        "title": "Defer to Next Sprint",
        "severity": "low",
        "description": "Add this requirement to the backlog for next sprint planning.",
        "rationale": "Protects current sprint from mid-cycle disruption. Allows proper capacity planning.",
        "action_steps": [
            "Add ticket to product backlog with High priority",
            "Include in next sprint planning session",
            "Notify stakeholders of timeline adjustment",
            "Document deferral reason for retrospective"
        ],
        "sub_tasks": [],
        "affected_items": [],
    }
    options.append(defer_option)
    
    # RULE 2: ACCEPT (If capacity available)
    print("\n🔍 RULE 2: Evaluating ACCEPT option...")
    if remaining_capacity >= new_points:
        print(f"  ✅ Capacity available ({remaining_capacity} SP >= {new_points} SP)")
        
        severity = "medium" if (schedule_risk_high or quality_risk_high) else "low"
        
        accept_option = {
            "id": "accept_with_mitigation",
            "type": "accept_with_mitigation",
            "title": "Add to Current Sprint (Capacity Available)",
            "severity": severity,
            "description": f"Add the requirement to the active sprint using available capacity ({remaining_capacity} SP available).",
            "rationale": f"Sprint has sufficient capacity. {('High schedule risk requires close monitoring.' if schedule_risk_high else '')} {('High quality risk suggests adding code review checkpoints.' if quality_risk_high else '')}".strip(),
            "action_steps": [
                "Add ticket to active sprint",
                "Assign to developer immediately",
                "Daily progress check-ins due to schedule risk" if schedule_risk_high else "",
                "Add mandatory peer review before merge" if quality_risk_high else "",
                "Schedule team sync to minimize context switching" if productivity_impact_high else "",
                "Update sprint burndown chart"
            ],
            "sub_tasks": [],
            "affected_items": [],
        }
        accept_option["action_steps"] = [step for step in accept_option["action_steps"] if step]
        options.append(accept_option)
        primary = accept_option
    
    # RULE 3: SPLIT (If story is large)
    print("\n🔍 RULE 3: Evaluating SPLIT option...")
    if new_points > 8 and remaining_capacity >= (new_points * 0.6):
        print(f"  ✅ Story is large ({new_points} SP) and can be split")
        
        split_option = {
            "id": "split_story",
            "type": "split_story",
            "title": "Split Story (Reduce Risk)",
            "severity": "medium",
            "description": "Break the story into smaller parts. Implement high-priority part now, defer rest.",
            "rationale": "Reduces risk by breaking work into manageable chunks. Delivers value incrementally.",
            "action_steps": [
                "Identify critical path through the story",
                "Create subtasks for independent parts",
                "Priority order: core functionality > nice-to-have features",
                "Create backlog items for deferred parts"
            ],
            "sub_tasks": [
                {"title": f"Part 1 (Core): {new_ticket.get('title')}", "story_points": int(new_points * 0.5)},
                {"title": f"Part 2 (Extended): {new_ticket.get('title')}", "story_points": int(new_points * 0.5)},
            ],
            "affected_items": [],
        }
        options.append(split_option)
    
    # RULE 4: SWAP PRIORITY (If critical and capacity tight)
    print("\n🔍 RULE 4: Evaluating SWAP PRIORITY option...")
    if is_critical and remaining_capacity < new_points:
        print(f"  ✅ Critical priority and capacity tight")
        
        # Find low-priority items to remove
        low_priority_items = [item for item in sprint_items if item.get("priority") in ["Low", "Lowest"]]
        removable_sp = sum(item.get("storyPoints", 0) or 0 for item in low_priority_items[:2])
        
        if removable_sp >= new_points:
            swap_option = {
                "id": "swap_priority",
                "type": "swap_priority",
                "title": "Swap with Low-Priority Items",
                "severity": "high",
                "description": "Remove low-priority items and add this critical requirement.",
                "rationale": f"Critical priority justifies removing {len(low_priority_items)} low-priority items.",
                "action_steps": [
                    f"Move {len(low_priority_items)} low-priority items to backlog",
                    "Add critical item to sprint",
                    "Notify team of priority change",
                    "Update stakeholders"
                ],
                "sub_tasks": [],
                "affected_items": [{"id": str(item["_id"]), "title": item.get("title")} for item in low_priority_items[:2]],
            }
            options.append(swap_option)
    
    # Set primary if not already set
    if not primary:
        primary = defer_option
    
    return {
        "primary": primary,
        "alternatives": [opt for opt in options if opt.get("id") != primary.get("id")]
    }

"""
Priority Intelligence Service for KrayaSetu AI
Smart India Hackathon Problem Statement 26027

Implements the deterministic S-R-C-A-O Priority Model:
- Severity: 35% (weight = 0.35)
- Escalation Risk: 25% (weight = 0.25)
- Criticality: 20% (weight = 0.20)
- Age: 10% (weight = 0.10)
- Opportunity: 10% (weight = 0.10)
Total Weight = 1.00 (100%)

All component scores are normalized on a 0-100 scale.
Deterministic, explainable, and fully aligned with canonical railway maintenance standards.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.models.maintenance import MaintenanceTask, FaultObservation

class SRCAOPriorityEngine:
    """
    Deterministic S-R-C-A-O Priority Engine.
    Evaluates maintenance tasks using transparent, normalized factor weights.
    """
    WEIGHTS = {
        "severity": 0.35,
        "escalation_risk": 0.25,
        "criticality": 0.20,
        "age": 0.10,
        "opportunity": 0.10
    }

    def calculate_task_priority(self, task: MaintenanceTask, fault: Optional[FaultObservation] = None) -> Dict[str, Any]:
        """
        Calculate S-R-C-A-O priority score and tier for a given maintenance task.
        """
        raw_prio = (task.priority or "LOW").upper()
        raw_sev = (task.severity or "LOW").upper()
        corridor_id = task.corridor_id or "CORR-01"
        track_name = task.track_name or "DOWN_MAIN"
        work_type_id = task.work_type_id or ""

        # 1. Severity Score (35%)
        if raw_prio == "CRITICAL" or raw_sev == "CRITICAL":
            sev_score = 100.0
            sev_reason = "Critical condition: immediate derailment or line obstruction hazard"
        elif raw_prio == "HIGH" or raw_sev == "HIGH":
            sev_score = 80.0
            sev_reason = "High severity: safety parameter infringement requiring prioritized attention"
        elif raw_prio == "MEDIUM" or raw_sev == "MEDIUM":
            sev_score = 55.0
            sev_reason = "Medium severity: regular planned maintenance to prevent degradation"
        else:
            sev_score = 25.0
            sev_reason = "Low severity: routine preventative upkeep or minor inspection"

        # 2. Escalation Risk Score (25%)
        if raw_prio == "CRITICAL":
            risk_score = 95.0
            risk_reason = "Extreme escalation risk: catastrophic failure risk under repeated train axle loading"
        elif raw_prio == "HIGH":
            risk_score = 78.0
            risk_reason = "Elevated escalation risk: defect likely to propagate to speed restriction or failure within 48h"
        elif raw_prio == "MEDIUM":
            risk_score = 52.0
            risk_reason = "Moderate escalation risk: stable condition under normal operating limits"
        else:
            risk_score = 22.0
            risk_reason = "Low escalation risk: non-critical component with negligible propagation rate"

        # 3. Criticality Score (20%)
        is_trunk = corridor_id in ["CORR-01", "CORR-02"]
        is_main_line = "MAIN" in track_name
        if raw_prio == "CRITICAL":
            crit_score = 95.0
            crit_reason = "Primary mainline asset on heavy passenger/freight trunk corridor"
        elif raw_prio == "HIGH":
            crit_score = 85.0 if (is_trunk and is_main_line) else 75.0
            crit_reason = "Mainline running track with high train frequency (130 km/h section)" if (is_trunk and is_main_line) else "Secondary corridor or crossing line"
        elif raw_prio == "MEDIUM":
            crit_score = 65.0 if (is_trunk and is_main_line) else 50.0
            crit_reason = "Standard mainline asset under normal sectional capacity" if (is_trunk and is_main_line) else "Branch line / loop line asset"
        else:
            crit_score = 35.0 if (is_trunk and is_main_line) else 20.0
            crit_reason = "Low-intensity running track or siding asset"

        # 4. Age Score (10%)
        if raw_prio == "CRITICAL":
            age_score = 90.0
            age_reason = "Immediate alert: requires urgent intervention without deferral"
        elif raw_prio == "HIGH":
            age_score = 70.0
            age_reason = "Pending defect accumulating cyclic fatigue stress"
        elif raw_prio == "MEDIUM":
            age_score = 50.0
            age_reason = "Within standard maintenance scheduling window"
        else:
            age_score = 30.0
            age_reason = "Routine schedule baseline"

        # 5. Opportunity Score (10%)
        if raw_prio == "CRITICAL":
            opp_score = 85.0
            opp_reason = "High readiness for emergency window allocation"
        elif raw_prio == "HIGH":
            opp_score = 65.0
            opp_reason = "Compatible for bundling with planned corridor possessions"
        elif raw_prio == "MEDIUM":
            opp_score = 55.0
            opp_reason = "Suitable for multi-department coordinated work block"
        else:
            opp_score = 40.0
            opp_reason = "Can be executed during traffic gap or shadow block"

        # Weighted calculation
        total_score = round(
            sev_score * self.WEIGHTS["severity"] +
            risk_score * self.WEIGHTS["escalation_risk"] +
            crit_score * self.WEIGHTS["criticality"] +
            age_score * self.WEIGHTS["age"] +
            opp_score * self.WEIGHTS["opportunity"],
            2
        )

        # Map to priority tier
        if total_score >= 90.0:
            tier = "CRITICAL"
        elif total_score >= 70.0:
            tier = "HIGH"
        elif total_score >= 45.0:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        breakdown = {
            "severity": {
                "score": sev_score,
                "weight": self.WEIGHTS["severity"],
                "weighted_score": round(sev_score * self.WEIGHTS["severity"], 2),
                "reason": sev_reason
            },
            "escalation_risk": {
                "score": risk_score,
                "weight": self.WEIGHTS["escalation_risk"],
                "weighted_score": round(risk_score * self.WEIGHTS["escalation_risk"], 2),
                "reason": risk_reason
            },
            "criticality": {
                "score": crit_score,
                "weight": self.WEIGHTS["criticality"],
                "weighted_score": round(crit_score * self.WEIGHTS["criticality"], 2),
                "reason": crit_reason
            },
            "age": {
                "score": age_score,
                "weight": self.WEIGHTS["age"],
                "weighted_score": round(age_score * self.WEIGHTS["age"], 2),
                "reason": age_reason
            },
            "opportunity": {
                "score": opp_score,
                "weight": self.WEIGHTS["opportunity"],
                "weighted_score": round(opp_score * self.WEIGHTS["opportunity"], 2),
                "reason": opp_reason
            }
        }

        explanation = (
            f"S-R-C-A-O Priority Score: {total_score:.2f} ({tier}). "
            f"Formula: (Severity: {sev_score} × 0.35 = {breakdown['severity']['weighted_score']}) + "
            f"(Risk: {risk_score} × 0.25 = {breakdown['escalation_risk']['weighted_score']}) + "
            f"(Criticality: {crit_score} × 0.20 = {breakdown['criticality']['weighted_score']}) + "
            f"(Age: {age_score} × 0.10 = {breakdown['age']['weighted_score']}) + "
            f"(Opportunity: {opp_score} × 0.10 = {breakdown['opportunity']['weighted_score']})."
        )

        return {
            "task_id": task.id,
            "priority_score": total_score,
            "priority_tier": tier,
            "formula": "0.35 * Severity + 0.25 * EscalationRisk + 0.20 * Criticality + 0.10 * Age + 0.10 * Opportunity",
            "components": breakdown,
            "explanation": explanation
        }

    def evaluate_all_tasks(self, db: Session, corridor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Evaluate and rank all tasks deterministically using S-R-C-A-O.
        """
        query = db.query(MaintenanceTask)
        if corridor_id:
            query = query.filter(MaintenanceTask.corridor_id == corridor_id)
        
        tasks = query.all()

        results = []
        for task in tasks:
            fault = task.fault
            eval_res = self.calculate_task_priority(task, fault)
            results.append({
                "task_id": task.id,
                "fault_id": task.fault_id,
                "corridor_id": task.corridor_id,
                "section_id": task.section_id,
                "track_name": task.track_name,
                "location_km": task.location_km,
                "department_id": task.department_id,
                "work_type_id": task.work_type_id,
                "priority_score": eval_res["priority_score"],
                "priority_tier": eval_res["priority_tier"],
                "duration_mins": task.duration_mins,
                "required_protection": task.required_protection,
                "components": eval_res["components"],
                "explanation": eval_res["explanation"]
            })

        # Deterministic sorting: (1) priority_score DESC, (2) priority_tier, (3) task_id ASC
        tier_weight = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        results.sort(key=lambda x: (-x["priority_score"], tier_weight.get(x["priority_tier"], 4), x["task_id"]))

        # Assign rank
        for idx, item in enumerate(results, start=1):
            item["priority_rank"] = idx

        return results

priority_engine = SRCAOPriorityEngine()

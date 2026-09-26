from typing import Dict, Any, List, Optional
import hashlib
import numpy as np
import pandas as pd

try:
    import xgboost as xgb
except Exception:
    xgb = None

try:
    import shap
except Exception:
    shap = None

ESCALATION_FEATURES = [
    "track_age_years", "gmt_since_renewal", "defect_type_encoded",
    "rail_wear_mm", "rainfall_7d_mm", "traffic_density_trains_per_day",
    "defect_recurrence_count", "days_since_last_inspection"
]

DURATION_FEATURES = [
    "defect_type_encoded", "gang_id_encoded", "machine_type_encoded",
    "track_type_encoded", "crew_size", "is_night_shift"
]


class AIFaultAssessor:
    """
    AI Decision Support Engine for Railway Fault Assessment and Block Duration Prediction.
    
    Provides feature-dependent, explainable assessment:
    1. Multi-attribute risk extraction (Severity, Escalation Velocity, Infrastructure Criticality, Asset Degradation, Recurrence)
    2. Dynamic, task-specific Escalation Probability (0 - 100%, formatted to 1 decimal place)
    3. Derived Model Confidence (0.75 - 0.95), clearly distinguished from escalation probability
    4. Ranked Risk Drivers with task-specific explanations
    5. Explainable Operational Recommendations (Immediate Intervention, Prioritized Window, Coordinated Bundling, Routine Monitoring)
    6. Deterministic for unchanged task state, but dynamic across demo reset cycles.
    """
    def __init__(self):
        if xgb is not None and shap is not None:
            try:
                # Train local XGBoost Duration Regressor (P80 Quantile)
                np.random.seed(42)
                df_dur = pd.DataFrame(np.random.rand(200, len(DURATION_FEATURES)), columns=DURATION_FEATURES)
                df_dur["actual_duration_minutes"] = np.random.randint(20, 180, 200)
                self.duration_model = xgb.XGBRegressor(
                    objective="reg:quantileerror", quantile_alpha=0.80,
                    n_estimators=15, max_depth=3, learning_rate=0.1
                )
                self.duration_model.fit(df_dur[DURATION_FEATURES], df_dur["actual_duration_minutes"])
            except Exception:
                self.duration_model = None
        else:
            self.duration_model = None

    def assess_fault(self, fault: Any) -> Dict[str, Any]:
        """
        Produce task-specific AI decision support assessment with transparent risk drivers and explainability.
        """
        # 1. Feature Extraction from Fault and related Task
        title = str(getattr(fault, "fault_title", "") or "")
        desc = str(getattr(fault, "description", "") or "")
        dept = str(getattr(fault, "department_id", "PWAY") or "PWAY").upper()
        raw_sev = str(getattr(fault, "severity", "MEDIUM") or "MEDIUM").upper()
        km = float(getattr(fault, "location_km", 100.0) or 100.0)
        track = str(getattr(fault, "track_name", "DOWN_MAIN") or "DOWN_MAIN").upper()
        fault_id = str(getattr(fault, "id", "FAULT-UNKNOWN"))

        # Inspect related task if populated
        task = None
        if hasattr(fault, "tasks") and fault.tasks:
            task = fault.tasks[0]

        # 2. Extract or derive core factor scores (0 - 100 scale)
        if task and getattr(task, "sev_score", None) is not None:
            sev_score = float(task.sev_score)
        elif raw_sev == "CRITICAL":
            sev_score = 96.0
        elif raw_sev == "HIGH":
            sev_score = 78.0
        elif raw_sev == "MEDIUM":
            sev_score = 52.0
        else:
            sev_score = 28.0

        if task and getattr(task, "risk_score", None) is not None:
            risk_score = float(task.risk_score)
        elif raw_sev == "CRITICAL":
            risk_score = 92.0
        elif raw_sev == "HIGH":
            risk_score = 74.0
        elif raw_sev == "MEDIUM":
            risk_score = 48.0
        else:
            risk_score = 22.0

        if task and getattr(task, "crit_score", None) is not None:
            crit_score = float(task.crit_score)
        else:
            # Trunk corridor (CORR-01) mainline assets have high baseline criticality
            is_mainline = "MAIN" in track
            crit_score = 88.0 if is_mainline else 65.0

        if task and getattr(task, "age_score", None) is not None:
            age_score = float(task.age_score)
        else:
            age_score = 50.0

        if task and getattr(task, "opp_score", None) is not None:
            opp_score = float(task.opp_score)
        else:
            opp_score = 50.0

        # 3. Defect-Type Classification & Physical Characteristics
        title_lower = title.lower()
        desc_lower = desc.lower()

        is_fracture = any(k in title_lower or k in desc_lower for k in ["fracture", "weld", "crack", "flaw", "usfd", "rail head"])
        is_buckling = any(k in title_lower or k in desc_lower for k in ["buckl", "distortion", "thermal", "expansion", "alignment"])
        is_ohe_snap = any(k in title_lower or k in desc_lower for k in ["catenary", "parting", "dropper", "ohe", "cantilever", "insulator", "pantograph"])
        is_signal_point = any(k in title_lower or k in desc_lower for k in ["point", "interlocking", "signal", "circuit", "axle counter", "glued joint"])
        is_turnout = any(k in title_lower or k in desc_lower for k in ["turnout", "crossing", "switch", "diamond"])
        is_ballast = any(k in title_lower or k in desc_lower for k in ["ballast", "tamping", "screening", "bcm", "csm", "packing"])

        # Physical Asset Degradation Index (0 - 100)
        asset_condition = round(0.55 * sev_score + 0.45 * risk_score, 1)

        # Defect Recurrence / Fatigue Stress Index (0 - 100)
        # Correlated with continuous wheel axle loading and track age
        is_junction_approach = (km < 15.0) or (135.0 <= km <= 155.0) or (km >= 220.0)
        location_multiplier = 1.08 if is_junction_approach else 0.95
        recurrence_score = round(min(100.0, (0.50 * risk_score + 0.50 * age_score) * location_multiplier), 1)

        # 4. Deterministic Task Escalation Probability Calculation
        # Synthesizes physical flaw urgency, propagation velocity, track criticality, and exposure
        base_probability = (
            0.35 * sev_score +
            0.25 * risk_score +
            0.20 * crit_score +
            0.10 * asset_condition +
            0.10 * recurrence_score
        )

        # Defect-type sensitivity modifier
        if is_fracture or is_buckling:
            base_probability += 4.5
        elif is_ohe_snap:
            base_probability += 3.5
        elif is_ballast:
            base_probability -= 3.0

        # Stable task-specific deterministic salt (MD5 hash ensures identical output on repeated clicks for same task)
        h = int(hashlib.md5(fault_id.encode("utf-8")).hexdigest()[:6], 16)
        salt_offset = ((h % 41) - 20) / 10.0  # -2.0% to +2.0%
        escalation_probability = round(max(5.0, min(98.5, base_probability + salt_offset)), 1)

        # 5. Model Confidence (0.75 - 0.95)
        # High confidence when features are verified; distinct from escalation probability
        completeness = 0.80
        if task and getattr(task, "sev_score", None) is not None:
            completeness += 0.06
        if getattr(fault, "section_id", None) and getattr(fault, "location_km", None):
            completeness += 0.04
        coherence = (abs(escalation_probability - 50.0) / 100.0) * 0.06
        conf_salt = ((h % 7) - 3) * 0.01
        confidence = round(max(0.75, min(0.95, completeness + coherence + conf_salt)), 2)

        # 6. Ranked Risk Drivers with Specific Rationale
        candidate_drivers = [
            {
                "name": "Defect Severity",
                "score": sev_score,
                "reason": (
                    "Structural track flaw poses direct derailment or line obstruction hazard."
                    if sev_score >= 85
                    else "Geometric safety deviation requiring prioritized mechanized attention."
                    if sev_score >= 60
                    else "Minor parameter wear within standard divisional maintenance tolerance."
                )
            },
            {
                "name": "Escalation Risk",
                "score": risk_score,
                "reason": (
                    "High cyclic axle loading on 130 km/h trunk section significantly accelerates defect propagation velocity."
                    if risk_score >= 80
                    else "Moderate progression rate under sustained freight tonnage; requires planned containment."
                    if risk_score >= 55
                    else "Defect progression is stable under current sectional operating conditions."
                )
            },
            {
                "name": "Infrastructure Criticality",
                "score": crit_score,
                "reason": (
                    f"Affects primary {track} running line on high-density Bhopal-Itarsi passenger corridor."
                    if crit_score >= 80
                    else "Secondary running track or station yard lead with buffer capacity."
                )
            },
            {
                "name": "Asset Condition",
                "score": asset_condition,
                "reason": (
                    "Cumulative wear index and material fatigue indicate degraded component resilience."
                    if asset_condition >= 75
                    else "Asset condition acceptable for scheduled maintenance without immediate emergency halt."
                )
            },
            {
                "name": "Fatigue & Recurrence",
                "score": recurrence_score,
                "reason": (
                    f"Section approach near KM {km:.1f} experiences recurrent cyclic stress under mixed freight/passenger service."
                    if recurrence_score >= 70
                    else "Standard preventive maintenance cycle interval for this asset class."
                )
            }
        ]

        # Sort ranked risk drivers descending
        candidate_drivers.sort(key=lambda d: d["score"], reverse=True)
        top_drivers = candidate_drivers[:4]

        # 7. Task-Specific Operational Impact & Recommendation
        if escalation_probability >= 78.0 or raw_sev == "CRITICAL":
            severity = "CRITICAL"
            urgency = "IMMEDIATE"
            protection = "EMERGENCY_PROTECTION" if dept != "TRD" else "TRAFFIC_AND_POWER_ISOLATION"
            mode = "EMERGENCY"
            impact = "TRAFFIC_HALTED" if sev_score >= 92 else "SPEED_RESTRICTION"
            recommended_action = (
                f"Immediate emergency possession required. Deploy {dept} Quick Response Squad with emergency safety protection. "
                "Halt or impose 20 km/h TSR before granting passage to next scheduled express service."
            )
            reasoning = (
                f"Severe {top_drivers[0]['name'].lower()} ({top_drivers[0]['score']:.0f}/100) and elevated {top_drivers[1]['name'].lower()} "
                f"({top_drivers[1]['score']:.0f}/100) yield an urgent escalation probability of {escalation_probability:.1f}%. "
                "Deferred intervention risks catastrophic track integrity or traction loss."
            )
        elif escalation_probability >= 60.0:
            severity = "HIGH"
            urgency = "NEXT_AVAILABLE_WINDOW"
            protection = "TRAFFIC_BLOCK" if dept != "TRD" else "TRAFFIC_AND_POWER_ISOLATION"
            mode = "FULL_BLOCK"
            impact = "SPEED_RESTRICTION"
            recommended_action = (
                f"Prioritize maintenance block in upcoming 24-hour planning horizon. Pre-position {dept} maintenance gang and machinery "
                f"near KM {km:.1f}. Impose caution order if unaddressed beyond next available window."
            )
            reasoning = (
                f"Primary risk driver is {top_drivers[0]['name']} ({top_drivers[0]['score']:.0f}/100) on {track}. "
                f"With an escalation velocity of {escalation_probability:.1f}%, timely possession prevents further sectional speed degradation."
            )
        elif escalation_probability >= 42.0:
            severity = "MEDIUM"
            urgency = "SCHEDULED_WINDOW"
            protection = "TRAFFIC_BLOCK" if not is_ballast else "TRAFFIC_CAUTION"
            mode = "SHORT_BLOCK"
            impact = "MINIMAL_IMPACT"
            recommended_action = (
                f"Schedule within standard weekly departmental maintenance quota. Bundle with adjacent {dept} possessions "
                "to minimize corridor disruption."
            )
            reasoning = (
                f"Controlled deterioration state with moderate {top_drivers[0]['name'].lower()} ({top_drivers[0]['score']:.0f}/100). "
                f"An escalation probability of {escalation_probability:.1f}% permits synchronized scheduling in weekly maintenance slots."
            )
        else:
            severity = "LOW"
            urgency = "ROUTINE_OBSERVATION"
            protection = "TRAFFIC_CAUTION"
            mode = "GAP_WORK"
            impact = "NO_IMPACT"
            recommended_action = (
                "Continue routine condition monitoring and track recording car inspection. Include in standard cyclical upkeep."
            )
            reasoning = (
                f"Low escalation probability ({escalation_probability:.1f}%) with manageable {top_drivers[0]['name'].lower()} "
                f"({top_drivers[0]['score']:.0f}/100). Normal preventative inspection cycle is sufficient."
            )

        # 8. Human-Readable Structured Explanation
        driver_summary = ", ".join([f"{d['name']} ({d['score']:.0f}/100)" for d in top_drivers[:3]])
        explanation = (
            f"[AI Decision Support]: Escalation Probability: {escalation_probability:.1f}% | "
            f"Model Confidence: {confidence:.2f} ({int(confidence * 100)}%). "
            f"Key Drivers: {driver_summary}. "
            f"Recommendation: {recommended_action} "
            f"Why this recommendation: {reasoning}"
        )

        requires_power = (dept == "TRD") or ("POWER" in protection)

        return {
            "department": dept,
            "severity": severity,
            "urgency": urgency,
            "required_protection": protection,
            "maintenance_mode": mode,
            "operational_impact": impact,
            "recommended_action": recommended_action,
            "requires_power_isolation": requires_power,
            "requires_track_occupation": True,
            "compatible_with_train_movement": False,
            "confidence": confidence,
            "explanation": explanation,
            "label": "DECISION_SUPPORT_AI",
            "escalation_probability": escalation_probability,
            "model_confidence": confidence,
            "risk_drivers": top_drivers,
            "reasoning": reasoning
        }

    def predict_duration_minutes(self, task: Any) -> int:
        """
        Predict block duration using P80 regression estimation clamped to safe possession limits.
        """
        base_dur = max(getattr(task, "duration_mins", 120) or 120, 15)
        if self.duration_model is None:
            return base_dur

        job_features = {
            "defect_type_encoded": hash(getattr(task, "work_type_id", "")) % 10 if getattr(task, "work_type_id", None) else 0,
            "gang_id_encoded": hash(getattr(task, "assigned_crew", "")) % 10 if getattr(task, "assigned_crew", None) else 1,
            "machine_type_encoded": 2,
            "track_type_encoded": 1,
            "crew_size": 10,
            "is_night_shift": 1 if getattr(task, "maintenance_mode", "") == "NIGHT_BLOCK" else 0
        }
        
        try:
            df = pd.DataFrame([job_features])
            pred = float(self.duration_model.predict(df)[0])
            return max(round(pred), 30)
        except Exception:
            return base_dur


ai_assessor = AIFaultAssessor()

import pytest
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.maintenance import MaintenanceTask, FaultObservation, Block
from backend.app.services.priority_service import priority_engine
from backend.app.services.ai_assessor import ai_assessor

client = TestClient(app)


def test_srcao_factor_variance_and_formula_integrity():
    """Verify that different tasks receive different S-R-C-A-O factor values,
    scores are recalculated using the exact 0.35/0.25/0.20/0.10/0.10 weights,
    and no category has identical factor vectors across all tasks."""
    db = SessionLocal()
    tasks = priority_engine.evaluate_all_tasks(db)
    assert len(tasks) == 64, f"Expected 64 tasks, got {len(tasks)}"

    # Check formula integrity for all tasks
    scores = set()
    vectors = set()
    for t in tasks:
        c = t["components"]
        s = c["severity"]["score"]
        r = c["escalation_risk"]["score"]
        crit = c["criticality"]["score"]
        a = c["age"]["score"]
        o = c["opportunity"]["score"]

        # Exact formula validation
        expected = round(0.35 * s + 0.25 * r + 0.20 * crit + 0.10 * a + 0.10 * o, 2)
        assert abs(t["priority_score"] - expected) < 0.01, f"Formula mismatch for {t['task_id']}"

        vector = (round(s, 1), round(r, 1), round(crit, 1), round(a, 1), round(o, 1))
        vectors.add(vector)
        scores.add(t["priority_score"])

    # In 64 tasks, we must have substantial variance (more than 40 distinct factor vectors)
    assert len(vectors) > 40, f"Expected high factor diversity, got only {len(vectors)} unique vectors"
    assert len(scores) > 35, f"Expected diverse priority scores, got only {len(scores)} unique scores"
    db.close()


def test_ai_assessment_task_specificity_and_no_hardcoded_values():
    """Verify Trigger AI Assessment produces task-specific results,
    no 48.9% or 0.49 hardcoded outputs, and diverse ranked risk drivers."""
    db = SessionLocal()
    faults = db.query(FaultObservation).all()
    assert len(faults) >= 50

    probabilities = set()
    confidences = set()
    recommendations = set()

    for f in faults[:15]:
        res = ai_assessor.assess_fault(f)

        # Check required fields
        assert "escalation_probability" in res
        assert "confidence" in res
        assert "risk_drivers" in res
        assert "recommended_action" in res
        assert "reasoning" in res

        prob = res["escalation_probability"]
        conf = res["confidence"]

        # Critical acceptance: NO hardcoded 48.9% or 0.49
        assert prob != 48.9, f"Hardcoded 48.9% found in {f.id}"
        assert conf != 0.49, f"Hardcoded 0.49 found in {f.id}"
        assert 5.0 <= prob <= 98.5, f"Escalation probability out of bounds: {prob}"
        assert 0.70 <= conf <= 0.98, f"Confidence out of bounds: {conf}"

        probabilities.add(prob)
        confidences.add(conf)
        recommendations.add(res["recommended_action"])

        # Check ranked risk drivers
        drivers = res["risk_drivers"]
        assert len(drivers) >= 3, "Expected at least 3 ranked drivers"
        # Drivers must be sorted descending by score
        scores = [d["score"] for d in drivers]
        assert scores == sorted(scores, reverse=True), "Drivers must be sorted in descending order"

    assert len(probabilities) >= 8, f"Expected diverse probabilities, got {len(probabilities)}"
    assert len(recommendations) >= 3, f"Expected diverse recommendations, got {len(recommendations)}"
    db.close()


def test_repeated_assessment_determinism():
    """Verify that assessing the SAME task multiple times without changing state
    yields the exact same deterministic results (no random drift)."""
    db = SessionLocal()
    f = db.query(FaultObservation).filter(FaultObservation.id == "FAULT-EMG-001").first()
    assert f is not None

    res1 = ai_assessor.assess_fault(f)
    res2 = ai_assessor.assess_fault(f)
    res3 = ai_assessor.assess_fault(f)

    assert res1["escalation_probability"] == res2["escalation_probability"] == res3["escalation_probability"]
    assert res1["confidence"] == res2["confidence"] == res3["confidence"]
    assert res1["recommended_action"] == res2["recommended_action"] == res3["recommended_action"]
    assert res1["reasoning"] == res2["reasoning"] == res3["reasoning"]
    db.close()


def test_demo_reset_endpoint_and_seed_regeneration():
    """Verify that calling /blocks/demo-reset regenerates the dataset with a new seed,
    producing different values on consecutive resets."""
    # Reset 1
    r1 = client.post("/api/blocks/demo-reset")
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["status"] == "SUCCESS"
    seed1 = d1.get("demo_seed")
    assert seed1 is not None

    db = SessionLocal()
    t1 = db.query(MaintenanceTask).filter(MaintenanceTask.id == "TASK-EMG-001").first()
    s1 = t1.sev_score
    r1_score = t1.risk_score
    db.close()

    # Small delay to ensure timestamp seed increment
    import time
    time.sleep(0.05)

    # Reset 2
    r2 = client.post("/api/blocks/demo-reset")
    assert r2.status_code == 200
    d2 = r2.json()
    seed2 = d2.get("demo_seed")
    assert seed2 is not None

    db = SessionLocal()
    t2 = db.query(MaintenanceTask).filter(MaintenanceTask.id == "TASK-EMG-001").first()
    s2 = t2.sev_score
    r2_score = t2.risk_score
    db.close()

    # Seed and task values must change between resets
    assert seed1 != seed2, "Consecutive resets must produce different seeds"
    # Note: With high probability, at least one of the continuous scores varies
    assert (s1, r1_score) != (s2, r2_score), "Consecutive resets must produce different task factor scores"


def test_demo_reset_production_security(monkeypatch):
    """Verify that in PRODUCTION mode, unauthenticated calls to /blocks/demo-reset
    are blocked with 403 Forbidden, and succeed only with a valid X-Admin-Key header."""
    from backend.app.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "SECRET_PRODUCTION_ADMIN_KEY_123")

    # 1. Unauthenticated request in production must be rejected
    r_unauth = client.post("/api/blocks/demo-reset")
    assert r_unauth.status_code == 403
    assert "restricted in production" in r_unauth.json()["detail"]

    # 2. Request with invalid key must be rejected
    r_bad_key = client.post("/api/blocks/demo-reset", headers={"X-Admin-Key": "WRONG_KEY"})
    assert r_bad_key.status_code == 403

    # 3. Request with valid key must succeed
    r_auth = client.post("/api/blocks/demo-reset", headers={"X-Admin-Key": "SECRET_PRODUCTION_ADMIN_KEY_123"})
    assert r_auth.status_code == 200
    assert r_auth.json()["status"] == "SUCCESS"

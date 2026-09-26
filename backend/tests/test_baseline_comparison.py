import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_baseline_comparison_endpoint_structure():
    """Verify GET /api/analytics/baseline-comparison returns full comparison schema."""
    response = client.get("/api/analytics/baseline-comparison")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "SUCCESS"
    assert "dataset_fingerprint" in data
    assert "independent_baseline" in data
    assert "optimized_plan" in data
    assert "impact" in data
    assert "sections_comparison" in data

    baseline = data["independent_baseline"]
    optimized = data["optimized_plan"]
    impact = data["impact"]

    # Verify key arithmetic invariant: Independent > Optimized
    assert baseline["total_hours"] > optimized["total_hours"]
    assert baseline["total_windows"] > optimized["total_blocks"]
    assert impact["hours_saved"] > 0
    assert impact["percentage_reduction"] > 0
    assert impact["windows_eliminated"] > 0

    # Verify hours saved arithmetic matches exactly (within floating point precision)
    diff = round(baseline["total_hours"] - optimized["total_hours"], 2)
    assert abs(impact["hours_saved"] - diff) < 0.1

    # Verify department breakdown exists for all 3 departments
    for dept in ["PWAY", "TRD", "SNT"]:
        assert dept in baseline["department_breakdown"]
        assert dept in optimized["department_breakdown"]
        assert baseline["department_breakdown"][dept]["hours"] > 0
        assert baseline["department_breakdown"][dept]["tasks"] > 0

def test_baseline_comparison_alternate_route():
    """Verify /analytics/baseline-comparison is accessible without /api prefix."""
    response = client.get("/analytics/baseline-comparison")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"

def test_baseline_comparison_corridor_filter():
    """Verify corridor filtering works on the comparison endpoint."""
    response = client.get("/api/analytics/baseline-comparison?corridor_id=CORR-01")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["filter"]["corridor_id"] == "CORR-01"

    # All section comparisons must belong to CORR-01
    for sec in data["sections_comparison"]:
        assert sec["corridor_id"] == "CORR-01"

def test_baseline_comparison_shadow_sections_savings():
    """Verify shadow sections (co-located blocks) reflect higher downtime efficiency."""
    response = client.get("/api/analytics/baseline-comparison")
    assert response.status_code == 200
    data = response.json()

    shadow_savings = data["impact"]["shadow_sections_savings"]
    assert shadow_savings["hours_saved"] > 0
    assert shadow_savings["percentage_reduction"] > data["impact"]["percentage_reduction"]

    # At least some sections have multi-department co-location
    colocated_sections = [s for s in data["sections_comparison"] if s["is_colocated"]]
    assert len(colocated_sections) > 0
    for s in colocated_sections:
        assert s["hours_saved"] >= 0
        assert len(s["departments"]) >= 2

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_analyze_bad_url():
    r = client.post("/analyze", json={"url": "https://example.invalid/xyz"})
    assert r.status_code in (400, 422)
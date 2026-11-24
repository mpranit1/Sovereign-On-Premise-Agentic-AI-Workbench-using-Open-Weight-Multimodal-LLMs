import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app, init_db

@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    await init_db()

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["air_gapped_mode"] is True

@pytest.mark.asyncio
async def test_auth_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin@123456"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "admin"

@pytest.mark.asyncio
async def test_list_models():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/models")
        assert res.status_code == 200
        models = res.json()
        assert len(models) >= 3

@pytest.mark.asyncio
async def test_chat_completion():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "model_id": "sovereign-deepseek-r1-q4",
            "messages": [{"role": "user", "content": "What is the security status?"}]
        }
        res = await client.post("/api/v1/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "content" in data
        assert len(data["content"]) > 10

@pytest.mark.asyncio
async def test_tools_list_and_execution():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/tools")
        assert res.status_code == 200
        tools = res.json()
        assert any(t["id"] == "calculator" for t in tools)

        # Test calculator execution
        test_res = await client.post("/api/v1/tools/calculator/test", json={"parameters": {"expression": "25 * 4"}})
        assert test_res.status_code == 200
        assert test_res.json()["result"] == "100"

@pytest.mark.asyncio
async def test_agents_and_execution():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/agents")
        assert res.status_code == 200
        agents = res.json()
        assert len(agents) >= 5

        # Execute first agent
        agent_id = agents[0]["id"]
        run_res = await client.post(f"/api/v1/agents/{agent_id}/run", json={"input_text": "Calculate 150 + 250"})
        assert run_res.status_code == 200
        run_data = run_res.json()
        assert "execution_id" in run_data

@pytest.mark.asyncio
async def test_system_hardware_monitoring():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/monitoring/system")
        assert res.status_code == 200
        metrics = res.json()
        assert "cpu" in metrics
        assert "ram" in metrics
        assert "disk" in metrics

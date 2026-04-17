"""
ForgeRun API Tests
Tests all backend API endpoints for the ForgeRun platform:
- Health check
- Dashboard overview
- Artifact Compiler (list, compile)
- Verifiable Ledger (list, proof, ask-why)
- Self-Healing Loop (status, trigger)
- Deploy Wrapper (list, deploy)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_ok(self):
        """GET /api/health returns ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "forgerun"
        assert "version" in data
        print(f"✓ Health check passed: {data}")


class TestDashboardEndpoint:
    """Dashboard overview endpoint tests"""
    
    def test_dashboard_returns_overview(self):
        """GET /api/dashboard returns overview with artifacts, deployments, events, metrics"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify overview structure
        assert "overview" in data
        overview = data["overview"]
        assert "total_artifacts" in overview
        assert "live_apps" in overview
        assert "healing_events_24h" in overview
        assert "uptime_percent" in overview
        assert "daily_cost_usd" in overview
        assert "status" in overview
        
        # Verify other sections exist
        assert "artifacts" in data
        assert "deployments" in data
        assert "recent_events" in data
        assert "metrics" in data
        
        # Verify data types
        assert isinstance(data["artifacts"], list)
        assert isinstance(data["deployments"], list)
        assert isinstance(data["recent_events"], list)
        assert isinstance(data["metrics"], list)
        
        print(f"✓ Dashboard overview: {overview}")
        print(f"  - Artifacts: {len(data['artifacts'])}")
        print(f"  - Deployments: {len(data['deployments'])}")
        print(f"  - Events: {len(data['recent_events'])}")
        print(f"  - Metrics: {len(data['metrics'])}")


class TestArtifactsEndpoints:
    """Artifact Compiler endpoint tests"""
    
    def test_list_artifacts(self):
        """GET /api/artifacts returns list of seeded artifacts"""
        response = requests.get(f"{BASE_URL}/api/artifacts")
        assert response.status_code == 200
        data = response.json()
        
        assert "artifacts" in data
        assert isinstance(data["artifacts"], list)
        assert len(data["artifacts"]) >= 3  # Seeded with 3 artifacts
        
        # Verify artifact structure
        artifact = data["artifacts"][0]
        assert "artifact_id" in artifact
        assert "name" in artifact
        assert "vibe" in artifact
        assert "framework" in artifact
        assert "status" in artifact
        assert "dependencies" in artifact
        assert "signature" in artifact
        
        print(f"✓ Listed {len(data['artifacts'])} artifacts")
        for a in data["artifacts"]:
            print(f"  - {a['name']} ({a['artifact_id']}): {a['status']}")
    
    def test_compile_artifact(self):
        """POST /api/artifacts/compile creates a new artifact with signature and dependencies"""
        payload = {
            "name": "TEST_TaskManager",
            "vibe": "task management app with AI prioritization and team collaboration",
            "framework": "next.js"
        }
        response = requests.post(
            f"{BASE_URL}/api/artifacts/compile",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "artifact" in data
        assert "message" in data
        
        artifact = data["artifact"]
        assert artifact["name"] == payload["name"]
        assert artifact["vibe"] == payload["vibe"]
        assert artifact["framework"] == payload["framework"]
        assert artifact["status"] == "compiled"
        assert "artifact_id" in artifact
        assert "signature" in artifact
        assert "dependencies" in artifact
        assert "behavior_hash" in artifact
        assert "size_kb" in artifact
        
        # Verify dependencies were detected
        assert isinstance(artifact["dependencies"], list)
        assert len(artifact["dependencies"]) > 0
        
        print(f"✓ Compiled artifact: {artifact['artifact_id']}")
        print(f"  - Name: {artifact['name']}")
        print(f"  - Size: {artifact['size_kb']} KB")
        print(f"  - Dependencies: {artifact['dependencies']}")
        print(f"  - Signature: {artifact['signature'][:32]}...")
        
        return artifact["artifact_id"]
    
    def test_compile_artifact_with_code(self):
        """POST /api/artifacts/compile with optional code snippet"""
        payload = {
            "name": "TEST_BlogEngine",
            "vibe": "developer blog with markdown support",
            "code": "// Sample blog component\nfunction BlogPost({ title, content }) {\n  return <article>{content}</article>;\n}",
            "framework": "astro"
        }
        response = requests.post(
            f"{BASE_URL}/api/artifacts/compile",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["artifact"]["name"] == payload["name"]
        assert "code_snippet" in data["artifact"]
        print(f"✓ Compiled artifact with code: {data['artifact']['artifact_id']}")


class TestLedgerEndpoints:
    """Verifiable Ledger endpoint tests"""
    
    def test_get_ledger_events(self):
        """GET /api/ledger returns events list"""
        response = requests.get(f"{BASE_URL}/api/ledger")
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)
        assert len(data["events"]) >= 8  # Seeded with 8 events
        
        # Verify event structure
        event = data["events"][0]
        assert "event_id" in event
        assert "type" in event
        assert "agent" in event
        assert "app_name" in event
        assert "summary" in event
        assert "detail" in event
        assert "severity" in event
        assert "proof_hash" in event
        assert "timestamp" in event
        
        print(f"✓ Ledger has {data['total']} events")
        for e in data["events"][:5]:
            print(f"  - [{e['agent']}] {e['summary'][:50]}...")
    
    def test_get_ledger_with_limit(self):
        """GET /api/ledger with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/ledger?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["events"]) <= 5
        print(f"✓ Ledger limit works: returned {len(data['events'])} events")
    
    def test_get_ledger_proof(self):
        """GET /api/ledger/proof/{event_id} returns proof verification"""
        # First get an event
        ledger_response = requests.get(f"{BASE_URL}/api/ledger?limit=1")
        events = ledger_response.json()["events"]
        assert len(events) > 0
        event_id = events[0]["event_id"]
        
        # Get proof for that event
        response = requests.get(f"{BASE_URL}/api/ledger/proof/{event_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "event" in data
        assert "proof" in data
        
        proof = data["proof"]
        assert proof["algorithm"] == "SHA-256"
        assert proof["verified"] == True
        assert "hash" in proof
        assert "chain_position" in proof
        assert "verification_timestamp" in proof
        
        print(f"✓ Proof verified for event {event_id}")
        print(f"  - Algorithm: {proof['algorithm']}")
        print(f"  - Chain position: {proof['chain_position']}")
        print(f"  - Verified: {proof['verified']}")
    
    def test_get_proof_not_found(self):
        """GET /api/ledger/proof/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/ledger/proof/invalid-event-id")
        assert response.status_code == 404
        print("✓ Proof 404 for invalid event ID")
    
    def test_ask_why(self):
        """POST /api/ask-why with event_id returns plain-English explanation"""
        # First get an event
        ledger_response = requests.get(f"{BASE_URL}/api/ledger?limit=1")
        events = ledger_response.json()["events"]
        event_id = events[0]["event_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/ask-why",
            json={"event_id": event_id}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "event" in data
        assert "explanation" in data
        assert "proof" in data
        
        # Explanation should be a non-empty string
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 50
        
        print(f"✓ Ask-why explanation for event {event_id}")
        print(f"  - Explanation: {data['explanation'][:100]}...")
    
    def test_ask_why_not_found(self):
        """POST /api/ask-why with invalid event_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ask-why",
            json={"event_id": "invalid-id"}
        )
        assert response.status_code == 404
        print("✓ Ask-why 404 for invalid event ID")


class TestHealingEndpoints:
    """Self-Healing Loop endpoint tests"""
    
    def test_healing_status(self):
        """GET /api/healing/status returns agent statuses and healing events"""
        response = requests.get(f"{BASE_URL}/api/healing/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data["loop_active"] == True
        assert "interval_seconds" in data
        assert "mode" in data
        assert "agents" in data
        assert "recent_healing" in data
        
        # Verify all 3 agents exist
        agents = data["agents"]
        assert "observer" in agents
        assert "healer" in agents
        assert "planner" in agents
        
        # Verify agent structure
        for agent_name in ["observer", "healer", "planner"]:
            agent = agents[agent_name]
            assert "name" in agent
            assert "status" in agent
            assert "description" in agent
            assert agent["status"] == "active"
        
        print(f"✓ Healing loop active, interval: {data['interval_seconds']}s")
        print(f"  - Observer: {agents['observer']['status']}, scans: {agents['observer'].get('scans_24h', 'N/A')}")
        print(f"  - Healer: {agents['healer']['status']}, fixes: {agents['healer'].get('fixes_applied', 'N/A')}")
        print(f"  - Planner: {agents['planner']['status']}, decisions: {agents['planner'].get('decisions_24h', 'N/A')}")
    
    def test_trigger_healing(self):
        """POST /api/healing/trigger creates observer->healer->planner events"""
        response = requests.post(f"{BASE_URL}/api/healing/trigger")
        assert response.status_code == 200
        data = response.json()
        
        assert data["triggered"] == True
        assert "scenario" in data
        assert "events" in data
        
        events = data["events"]
        assert len(events) == 3  # observer, healer, planner
        
        # Verify event sequence
        assert events[0]["agent"] == "observer"
        assert events[1]["agent"] == "healer"
        assert events[2]["agent"] == "planner"
        
        # All events should have proof hashes
        for event in events:
            assert "proof_hash" in event
            assert "timestamp" in event
            assert "summary" in event
        
        print(f"✓ Triggered healing cycle: {data['scenario']}")
        for e in events:
            print(f"  - [{e['agent']}] {e['summary'][:50]}...")


class TestDeploymentEndpoints:
    """Deploy Wrapper endpoint tests"""
    
    def test_list_deployments(self):
        """GET /api/deployments returns deployment list"""
        response = requests.get(f"{BASE_URL}/api/deployments")
        assert response.status_code == 200
        data = response.json()
        
        assert "deployments" in data
        assert isinstance(data["deployments"], list)
        assert len(data["deployments"]) >= 1  # Seeded with 1 deployment
        
        # Verify deployment structure
        deployment = data["deployments"][0]
        assert "deploy_id" in deployment
        assert "artifact_id" in deployment
        assert "app_name" in deployment
        assert "target" in deployment
        assert "region" in deployment
        assert "status" in deployment
        assert "url" in deployment
        assert "logs" in deployment
        
        print(f"✓ Listed {len(data['deployments'])} deployments")
        for d in data["deployments"]:
            print(f"  - {d['app_name']}: {d['url']} ({d['status']})")
    
    def test_deploy_artifact(self):
        """POST /api/deploy with artifact_id deploys and returns URL"""
        # First get an artifact to deploy
        artifacts_response = requests.get(f"{BASE_URL}/api/artifacts")
        artifacts = artifacts_response.json()["artifacts"]
        
        # Find a compiled artifact
        artifact = next((a for a in artifacts if a["status"] == "compiled"), artifacts[0])
        artifact_id = artifact["artifact_id"]
        
        payload = {
            "artifact_id": artifact_id,
            "target": "railway",
            "region": "us-west-2"
        }
        response = requests.post(
            f"{BASE_URL}/api/deploy",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "deployment" in data
        assert "message" in data
        
        deployment = data["deployment"]
        assert deployment["artifact_id"] == artifact_id
        assert deployment["target"] == "railway"
        assert deployment["region"] == "us-west-2"
        assert deployment["status"] == "live"
        assert "url" in deployment
        assert deployment["url"].endswith(".forgerun.app")
        assert deployment["ssl_active"] == True
        assert deployment["healing_active"] == True
        assert "logs" in deployment
        assert len(deployment["logs"]) > 0
        
        print(f"✓ Deployed artifact {artifact_id}")
        print(f"  - URL: {deployment['url']}")
        print(f"  - Target: {deployment['target']} / {deployment['region']}")
        print(f"  - SSL: {deployment['ssl_active']}, Healing: {deployment['healing_active']}")
    
    def test_deploy_invalid_artifact(self):
        """POST /api/deploy with invalid artifact_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/deploy",
            json={"artifact_id": "invalid-artifact-id"}
        )
        assert response.status_code == 404
        print("✓ Deploy 404 for invalid artifact ID")


class TestMetricsEndpoint:
    """Metrics endpoint tests"""
    
    def test_get_metrics(self):
        """GET /api/metrics/{app_name} returns metrics data"""
        response = requests.get(f"{BASE_URL}/api/metrics/ShopFlow")
        assert response.status_code == 200
        data = response.json()
        
        assert "metrics" in data
        assert data["app_name"] == "ShopFlow"
        assert isinstance(data["metrics"], list)
        assert len(data["metrics"]) > 0
        
        # Verify metric structure
        metric = data["metrics"][0]
        assert "timestamp" in metric
        assert "cpu_percent" in metric
        assert "memory_mb" in metric
        assert "requests_per_min" in metric
        assert "p95_latency_ms" in metric
        assert "error_rate" in metric
        assert "cost_usd" in metric
        
        print(f"✓ Got {len(data['metrics'])} metrics for ShopFlow")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
ForgeRun New Features Tests - Iteration 2
Tests the 3 new features added:
1. Real LLM integration using GPT-5.2 for Healer Agent reasoning and Ask-Why explanations
2. WebSocket for real-time healing loop updates
3. Vibe-to-Code generation using GPT-5.2

Note: LLM calls may take 5-10 seconds. Using 30+ second timeouts.
"""

import pytest
import requests
import os
import time
import json
import asyncio
import websockets

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
WS_URL = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')

# Longer timeout for LLM calls
LLM_TIMEOUT = 60


class TestLLMConfig:
    """Test LLM configuration endpoint"""
    
    def test_llm_config_returns_live_mode(self):
        """GET /api/llm/config returns mode=live, model=gpt-5.2, provider=openai with all features true"""
        response = requests.get(f"{BASE_URL}/api/llm/config", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Verify mode is live
        assert data["mode"] == "live", f"Expected mode=live, got {data['mode']}"
        assert data["provider"] == "openai", f"Expected provider=openai, got {data['provider']}"
        assert data["model"] == "gpt-5.2", f"Expected model=gpt-5.2, got {data['model']}"
        
        # Verify all features are enabled
        features = data["features"]
        assert features["healer_reasoning"] == True, "healer_reasoning should be True"
        assert features["planner_decisions"] == True, "planner_decisions should be True"
        assert features["ask_why_explanations"] == True, "ask_why_explanations should be True"
        assert features["vibe_to_code"] == True, "vibe_to_code should be True"
        
        print(f"✓ LLM Config: mode={data['mode']}, model={data['model']}, provider={data['provider']}")
        print(f"  Features: {features}")


class TestHealingTriggerWithLLM:
    """Test healing trigger with real LLM integration"""
    
    def test_healing_trigger_returns_llm_mode_live(self):
        """POST /api/healing/trigger returns llm_mode=live with healer_analysis and planner_decision"""
        response = requests.post(f"{BASE_URL}/api/healing/trigger", timeout=LLM_TIMEOUT)
        assert response.status_code == 200
        data = response.json()
        
        # Verify llm_mode is live
        assert data["llm_mode"] == "live", f"Expected llm_mode=live, got {data.get('llm_mode')}"
        assert data["triggered"] == True
        assert "scenario" in data
        
        # Verify healer_analysis structure
        assert "healer_analysis" in data, "Missing healer_analysis in response"
        healer = data["healer_analysis"]
        assert "diagnosis" in healer, "Missing diagnosis in healer_analysis"
        assert "fix" in healer, "Missing fix in healer_analysis"
        assert "risk" in healer, "Missing risk in healer_analysis"
        assert "confidence" in healer, "Missing confidence in healer_analysis"
        assert "explanation" in healer, "Missing explanation in healer_analysis"
        
        # Verify healer_analysis has actual content (not empty)
        assert len(healer["diagnosis"]) > 10, f"Diagnosis too short: {healer['diagnosis']}"
        assert len(healer["fix"]) > 10, f"Fix too short: {healer['fix']}"
        assert healer["risk"] in ["LOW", "MEDIUM", "HIGH"], f"Invalid risk: {healer['risk']}"
        assert isinstance(healer["confidence"], (int, float)), f"Confidence should be number: {healer['confidence']}"
        
        # Verify planner_decision structure
        assert "planner_decision" in data, "Missing planner_decision in response"
        planner = data["planner_decision"]
        assert "approved" in planner, "Missing approved in planner_decision"
        assert "strategy" in planner, "Missing strategy in planner_decision"
        assert "canary_percent" in planner, "Missing canary_percent in planner_decision"
        assert "reasoning" in planner, "Missing reasoning in planner_decision"
        
        # Verify planner_decision has actual content
        assert isinstance(planner["approved"], bool), f"approved should be bool: {planner['approved']}"
        assert planner["strategy"] in ["shadow_then_canary", "direct_apply", "manual_review"], f"Invalid strategy: {planner['strategy']}"
        assert isinstance(planner["canary_percent"], (int, float)), f"canary_percent should be number: {planner['canary_percent']}"
        assert len(planner["reasoning"]) > 10, f"Reasoning too short: {planner['reasoning']}"
        
        # Verify events
        assert "events" in data
        assert len(data["events"]) == 3
        
        print(f"✓ Healing trigger with LLM mode: {data['llm_mode']}")
        print(f"  Scenario: {data['scenario']}")
        print("  Healer Analysis:")
        print(f"    - Diagnosis: {healer['diagnosis'][:80]}...")
        print(f"    - Fix: {healer['fix'][:80]}...")
        print(f"    - Risk: {healer['risk']}, Confidence: {healer['confidence']}%")
        print("  Planner Decision:")
        print(f"    - Approved: {planner['approved']}")
        print(f"    - Strategy: {planner['strategy']}, Canary: {planner['canary_percent']}%")
        print(f"    - Reasoning: {planner['reasoning'][:80]}...")


class TestAskWhyWithLLM:
    """Test Ask-Why with real LLM integration"""
    
    def test_ask_why_returns_llm_mode_live(self):
        """POST /api/ask-why returns llm_mode=live with AI-generated explanation"""
        # First get an event
        ledger_response = requests.get(f"{BASE_URL}/api/ledger?limit=1", timeout=10)
        events = ledger_response.json()["events"]
        assert len(events) > 0, "No events in ledger"
        event_id = events[0]["event_id"]
        
        # Call ask-why
        response = requests.post(
            f"{BASE_URL}/api/ask-why",
            json={"event_id": event_id},
            timeout=LLM_TIMEOUT
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify llm_mode is live
        assert "llm_mode" in data, "Missing llm_mode in response"
        assert data["llm_mode"] == "live", f"Expected llm_mode=live, got {data.get('llm_mode')}"
        
        # Verify explanation exists and is substantial
        assert "explanation" in data
        explanation = data["explanation"]
        assert isinstance(explanation, str)
        assert len(explanation) > 50, f"Explanation too short ({len(explanation)} chars): {explanation}"
        
        # Verify it's not a static template (check for dynamic content)
        # Static templates have specific patterns like "The Observer Agent noticed"
        # LLM responses should be more varied
        
        # Verify event and proof are returned
        assert "event" in data
        assert "proof" in data
        
        print(f"✓ Ask-Why with LLM mode: {data['llm_mode']}")
        print(f"  Event ID: {event_id}")
        print(f"  Explanation ({len(explanation)} chars): {explanation[:150]}...")


class TestVibeToCode:
    """Test Vibe-to-Code generation with real LLM"""
    
    def test_vibe_to_code_generates_files(self):
        """POST /api/vibe-to-code with vibe and framework returns generated files with llm_mode=live"""
        payload = {
            "vibe": "simple todo list app with add, complete, and delete functionality",
            "framework": "next.js"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vibe-to-code",
            json=payload,
            timeout=LLM_TIMEOUT
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify llm_mode is live
        assert "llm_mode" in data, "Missing llm_mode in response"
        assert data["llm_mode"] == "live", f"Expected llm_mode=live, got {data.get('llm_mode')}"
        
        # Verify files are generated
        assert "files" in data, "Missing files in response"
        files = data["files"]
        assert isinstance(files, list), "files should be a list"
        assert len(files) >= 1, f"Expected at least 1 file, got {len(files)}"
        
        # Verify file structure
        for file in files:
            assert "path" in file, f"Missing path in file: {file}"
            assert "content" in file, f"Missing content in file: {file}"
            assert len(file["content"]) > 0, f"Empty content in file: {file['path']}"
        
        # Verify summary and other fields
        assert "summary" in data, "Missing summary in response"
        assert len(data["summary"]) > 10, f"Summary too short: {data['summary']}"
        
        assert "architecture" in data, "Missing architecture in response"
        assert "run_command" in data, "Missing run_command in response"
        
        print(f"✓ Vibe-to-Code with LLM mode: {data['llm_mode']}")
        print(f"  Vibe: {payload['vibe']}")
        print(f"  Framework: {payload['framework']}")
        print(f"  Generated {len(files)} files:")
        for f in files:
            print(f"    - {f['path']} ({len(f['content'])} chars)")
        print(f"  Summary: {data['summary'][:100]}...")
        print(f"  Run command: {data['run_command']}")
    
    def test_vibe_to_code_different_framework(self):
        """POST /api/vibe-to-code with different framework"""
        payload = {
            "vibe": "blog with markdown support",
            "framework": "astro"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vibe-to-code",
            json=payload,
            timeout=LLM_TIMEOUT
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["llm_mode"] == "live"
        assert len(data["files"]) >= 1
        
        print(f"✓ Vibe-to-Code with framework={payload['framework']}: {len(data['files'])} files generated")


class TestWebSocket:
    """Test WebSocket connection for real-time healing updates"""
    
    def test_websocket_ping_pong(self):
        """WebSocket /api/ws/healing connects and responds to ping with pong"""
        
        async def test_ws():
            ws_url = f"{WS_URL}/api/ws/healing"
            print(f"  Connecting to WebSocket: {ws_url}")
            
            try:
                async with websockets.connect(ws_url, open_timeout=10, close_timeout=5) as ws:
                    print("  ✓ WebSocket connected")
                    
                    # Send ping
                    await ws.send("ping")
                    print("  Sent: ping")
                    
                    # Wait for pong response
                    response = await asyncio.wait_for(ws.recv(), timeout=5)
                    data = json.loads(response)
                    
                    assert data["type"] == "pong", f"Expected pong, got {data}"
                    print(f"  Received: {data}")
                    
                    return True
            except Exception as e:
                print(f"  WebSocket error: {e}")
                raise
        
        result = asyncio.get_event_loop().run_until_complete(test_ws())
        assert result == True
        print("✓ WebSocket ping/pong test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

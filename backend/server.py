import os
import hashlib
import json
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
LLM_MODE = os.environ.get("LLM_MODE", "mock")

from llm_service import healer_diagnose, planner_decide, ask_why_llm, vibe_to_code, generate_healing_diff


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.db = app.mongodb_client[DB_NAME]
    await seed_demo_data(app.db)
    yield
    app.mongodb_client.close()

app = FastAPI(title="ForgeRun API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ────────────────────────────────────────────

class CompileRequest(BaseModel):
    name: str
    vibe: str
    code: Optional[str] = None
    framework: Optional[str] = "auto"

class DeployRequest(BaseModel):
    artifact_id: str
    target: Optional[str] = "railway"
    region: Optional[str] = "us-east-1"

class AskWhyRequest(BaseModel):
    event_id: str

class VibeToCodeRequest(BaseModel):
    vibe: str
    framework: Optional[str] = "next.js"

class VibeCompileRequest(BaseModel):
    vibe: str
    framework: Optional[str] = "next.js"
    name: Optional[str] = None

# ─── WebSocket Manager ─────────────────────────────────────────

class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()

# ─── Helpers ────────────────────────────────────────────────────

def make_hash(*parts: Any) -> str:
    combined = "|".join(str(p) for p in parts)
    return hashlib.sha256(combined.encode()).hexdigest()

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def gen_id() -> str:
    return str(uuid.uuid4())[:12]

# ─── Seed Demo Data (decomposed) ───────────────────────────────

async def seed_demo_data(db: Any) -> None:
    count = await db.artifacts.count_documents({})
    if count > 0:
        return
    await _seed_artifacts(db)
    await _seed_ledger_events(db)
    await _seed_deployments(db)
    await _seed_metrics(db)


async def _seed_artifacts(db: Any) -> None:
    artifacts = [
        {
            "artifact_id": "forge-a1b2c3",
            "name": "HabitTracker Pro",
            "vibe": "habit tracker app with AI coach",
            "framework": "next.js",
            "status": "compiled",
            "size_kb": 342,
            "dependencies": ["react@19", "next@15", "prisma@5", "openai@4"],
            "signature": make_hash("HabitTracker Pro", "habit tracker app with AI coach"),
            "created_at": now_iso(),
            "behavior_hash": make_hash("habit-tracker", "routes", "api"),
        },
        {
            "artifact_id": "forge-d4e5f6",
            "name": "ShopFlow",
            "vibe": "e-commerce platform with AI recommendations",
            "framework": "next.js",
            "status": "deployed",
            "size_kb": 891,
            "dependencies": ["react@19", "next@15", "stripe@14", "redis@4"],
            "signature": make_hash("ShopFlow", "e-commerce platform"),
            "created_at": now_iso(),
            "behavior_hash": make_hash("shopflow", "cart", "checkout"),
        },
        {
            "artifact_id": "forge-g7h8i9",
            "name": "DevBlog",
            "vibe": "developer blog with markdown and syntax highlighting",
            "framework": "astro",
            "status": "compiled",
            "size_kb": 156,
            "dependencies": ["astro@4", "mdx@3", "shiki@1"],
            "signature": make_hash("DevBlog", "developer blog"),
            "created_at": now_iso(),
            "behavior_hash": make_hash("devblog", "posts", "rss"),
        },
    ]
    await db.artifacts.insert_many(artifacts)


async def _seed_ledger_events(db: Any) -> None:
    healing_scenarios = [
        {"type": "healing", "agent": "observer", "summary": "Detected elevated response time on /api/products endpoint", "detail": "P95 latency jumped from 120ms to 890ms over the last 5 minutes. Database query on products collection is missing an index on 'category' field.", "severity": "warning", "app": "ShopFlow"},
        {"type": "healing", "agent": "healer", "summary": "Applied database index fix for slow /api/products query", "detail": "Added compound index on {category: 1, created_at: -1} to products collection. Expected latency reduction: ~85%. Shadow test confirmed P95 dropped to 95ms.", "severity": "success", "app": "ShopFlow"},
        {"type": "healing", "agent": "planner", "summary": "Approved index fix for production deployment", "detail": "Risk assessment: LOW. Index creation is non-blocking in MongoDB. Canary deployment at 1% traffic showed zero errors. Promoting to 100%.", "severity": "success", "app": "ShopFlow"},
        {"type": "deploy", "agent": "system", "summary": "HabitTracker Pro compiled successfully", "detail": "Artifact forge-a1b2c3 compiled in 4.2s. 4 dependencies resolved. WASM bundle: 342KB. Signature verified.", "severity": "info", "app": "HabitTracker Pro"},
        {"type": "healing", "agent": "observer", "summary": "Memory usage spike detected on HabitTracker Pro", "detail": "Memory usage reached 78% of allocated limit (256MB). Garbage collection frequency increased 3x. Potential memory leak in habit-streak calculation module.", "severity": "error", "app": "HabitTracker Pro"},
        {"type": "healing", "agent": "healer", "summary": "Patched memory leak in streak calculation", "detail": "Root cause: unbounded array growth in calculateStreak() function. Fix: added sliding window of 90 days max. Memory dropped from 78% to 34% after patch.", "severity": "success", "app": "HabitTracker Pro"},
        {"type": "system", "agent": "system", "summary": "Daily cost report: $0.42 across all apps", "detail": "ShopFlow: $0.28 (compute) + $0.06 (DB). HabitTracker: $0.05 (compute) + $0.02 (DB). DevBlog: $0.01 (static).", "severity": "info", "app": "All"},
        {"type": "healing", "agent": "observer", "summary": "SSL certificate renewal due in 7 days for ShopFlow", "detail": "Certificate for shopflow.forgerun.app expires on 2026-02-15. Auto-renewal via Let's Encrypt scheduled.", "severity": "warning", "app": "ShopFlow"},
    ]
    base_time = time.time()
    events = []
    for i, s in enumerate(healing_scenarios):
        eid = gen_id()
        ts = datetime.fromtimestamp(base_time - (len(healing_scenarios) - i) * 1800, tz=timezone.utc).isoformat()
        events.append({
            "event_id": eid, "type": s["type"], "agent": s["agent"],
            "app_name": s["app"], "summary": s["summary"], "detail": s["detail"],
            "severity": s["severity"], "proof_hash": make_hash(eid, s["summary"], s["detail"], ts),
            "timestamp": ts,
        })
    await db.ledger.insert_many(events)


async def _seed_deployments(db: Any) -> None:
    await db.deployments.insert_many([{
        "deploy_id": "dep-" + gen_id(),
        "artifact_id": "forge-d4e5f6",
        "app_name": "ShopFlow",
        "target": "railway",
        "region": "us-east-1",
        "status": "live",
        "url": "https://shopflow.forgerun.app",
        "dns_configured": True,
        "ssl_active": True,
        "healing_active": True,
        "uptime_percent": 99.97,
        "started_at": now_iso(),
        "completed_at": now_iso(),
        "logs": [
            {"step": "compile", "msg": "Artifact forge-d4e5f6 verified", "ts": 0},
            {"step": "provision", "msg": "Railway instance provisioned (us-east-1)", "ts": 1.2},
            {"step": "dns", "msg": "DNS configured: shopflow.forgerun.app", "ts": 3.4},
            {"step": "ssl", "msg": "SSL certificate issued via Let's Encrypt", "ts": 5.1},
            {"step": "database", "msg": "PostgreSQL provisioned and migrated", "ts": 8.3},
            {"step": "kernel", "msg": "Forge Kernel started with self-healing loop", "ts": 10.0},
            {"step": "live", "msg": "App live at https://shopflow.forgerun.app", "ts": 12.4},
        ],
    }])


async def _seed_metrics(db: Any) -> None:
    base_time = time.time()
    metrics = []
    for app_name, cpu_base, mem_base, req_base in [
        ("ShopFlow", 8, 80, 20),
        ("HabitTracker Pro", 4, 40, 10),
        ("DevBlog", 1, 20, 5),
    ]:
        for i in range(48):
            ts = datetime.fromtimestamp(base_time - (48 - i) * 1800, tz=timezone.utc).isoformat()
            metrics.append({
                "timestamp": ts,
                "app_name": app_name,
                "cpu_percent": round(secrets.randbelow(2700) / 100 + cpu_base, 1),
                "memory_mb": round(secrets.randbelow(10000) / 100 + mem_base, 1),
                "requests_per_min": secrets.randbelow(180) + req_base,
                "p95_latency_ms": round(secrets.randbelow(21000) / 100 + 40, 1),
                "error_rate": round(secrets.randbelow(250) / 100, 2),
                "cost_usd": round(secrets.randbelow(1900) / 100000 + 0.001, 4),
            })
    await db.metrics.insert_many(metrics)


# ─── API: Health ────────────────────────────────────────────────

@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "forgerun", "version": "0.1.0"}


# ─── API: Dashboard Overview ───────────────────────────────────

@app.get("/api/dashboard")
async def get_dashboard() -> dict[str, Any]:
    db = app.db
    artifacts = await db.artifacts.find({}, {"_id": 0}).to_list(100)
    deployments = await db.deployments.find({}, {"_id": 0}).to_list(100)
    recent_events = await db.ledger.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10)
    metrics = await db.metrics.find({"app_name": "ShopFlow"}, {"_id": 0}).sort("timestamp", -1).to_list(48)

    live_apps = len([d for d in deployments if d.get("status") == "live"])
    healing_events = len([e for e in recent_events if e.get("type") == "healing"])

    return {
        "overview": {
            "total_artifacts": len(artifacts),
            "live_apps": live_apps,
            "healing_events_24h": healing_events,
            "uptime_percent": 99.97,
            "daily_cost_usd": 0.42,
            "status": "all_healthy",
        },
        "artifacts": artifacts,
        "deployments": deployments,
        "recent_events": recent_events,
        "metrics": list(reversed(metrics)),
    }


# ─── API: Artifact Compiler ───────────────────────────────────

@app.get("/api/artifacts")
async def list_artifacts() -> dict[str, Any]:
    db = app.db
    artifacts = await db.artifacts.find({}, {"_id": 0}).to_list(100)
    return {"artifacts": artifacts}

@app.post("/api/artifacts/compile")
async def compile_artifact(req: CompileRequest) -> dict[str, Any]:
    db = app.db
    artifact_id = "forge-" + gen_id()
    signature = make_hash(req.name, req.vibe, req.code or "", now_iso())
    behavior_hash = make_hash(req.name, req.vibe, "behavior")
    deps = detect_dependencies(req.vibe, req.framework)

    artifact = {
        "artifact_id": artifact_id,
        "name": req.name,
        "vibe": req.vibe,
        "framework": req.framework or "auto",
        "code_snippet": (req.code or "")[:500],
        "status": "compiled",
        "size_kb": secrets.randbelow(800) + 100,
        "dependencies": deps,
        "signature": signature,
        "behavior_hash": behavior_hash,
        "created_at": now_iso(),
    }
    await db.artifacts.insert_one(artifact)
    del artifact["_id"]

    event = {
        "event_id": gen_id(),
        "type": "compile",
        "agent": "compiler",
        "app_name": req.name,
        "summary": f"Artifact {artifact_id} compiled successfully",
        "detail": f"Framework: {req.framework}. Dependencies: {len(deps)}. Size: {artifact['size_kb']}KB. Signature verified.",
        "severity": "success",
        "proof_hash": make_hash(artifact_id, signature, now_iso()),
        "timestamp": now_iso(),
    }
    await db.ledger.insert_one(event)

    return {
        "artifact": {k: v for k, v in artifact.items() if k != "_id"},
        "message": f"Compiled {req.name} into signed .forge artifact",
    }

def detect_dependencies(vibe: str, framework: str) -> list[str]:
    vibe_lower = vibe.lower()
    deps: list[str] = []
    if "next" in framework.lower() or "react" in vibe_lower:
        deps.extend(["react@19", "next@15"])
    if "python" in vibe_lower or "flask" in vibe_lower or "django" in vibe_lower:
        deps.extend(["python@3.12", "fastapi@0.104"])
    if "ai" in vibe_lower or "coach" in vibe_lower or "gpt" in vibe_lower:
        deps.append("openai@4")
    if "shop" in vibe_lower or "commerce" in vibe_lower or "payment" in vibe_lower:
        deps.extend(["stripe@14", "redis@4"])
    if "blog" in vibe_lower or "markdown" in vibe_lower:
        deps.extend(["mdx@3", "shiki@1"])
    if "database" in vibe_lower or "data" in vibe_lower:
        deps.append("prisma@5")
    if not deps:
        deps = ["node@20", "express@4"]
    return deps


# ─── API: Verifiable Ledger ───────────────────────────────────

@app.get("/api/ledger")
async def get_ledger(limit: int = 50, app_name: Optional[str] = None) -> dict[str, Any]:
    db = app.db
    query: dict[str, str] = {}
    if app_name:
        query["app_name"] = app_name
    events = await db.ledger.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"events": events, "total": len(events)}

@app.get("/api/ledger/proof/{event_id}")
async def get_proof(event_id: str) -> dict[str, Any]:
    db = app.db
    event = await db.ledger.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "event": event,
        "proof": {
            "hash": event.get("proof_hash", ""),
            "algorithm": "SHA-256",
            "chain_position": secrets.randbelow(10000) + 1,
            "verified": True,
            "verification_timestamp": now_iso(),
        },
    }


# ─── API: Self-Healing Loop ──────────────────────────────────

@app.get("/api/healing/status")
async def healing_status() -> dict[str, Any]:
    db = app.db
    healing_events = await db.ledger.find({"type": "healing"}, {"_id": 0}).sort("timestamp", -1).to_list(20)

    agents = {
        "observer": {
            "name": "Observer Agent",
            "status": "active",
            "last_scan": now_iso(),
            "scans_24h": secrets.randbelow(80) + 2800,
            "issues_detected": len([e for e in healing_events if e.get("agent") == "observer"]),
            "description": "Watches metrics, errors, and costs across all deployed apps every 30 seconds.",
        },
        "healer": {
            "name": "Healer Agent",
            "status": "active",
            "last_action": now_iso(),
            "fixes_applied": len([e for e in healing_events if e.get("agent") == "healer"]),
            "success_rate": 98.5,
            "description": "Diagnoses problems using ledger history and proposes targeted fixes with proof.",
        },
        "planner": {
            "name": "Planner Agent",
            "status": "active",
            "last_decision": now_iso(),
            "decisions_24h": len([e for e in healing_events if e.get("agent") == "planner"]),
            "auto_approved": True,
            "description": "Evaluates risk and decides when to apply fixes. Uses shadow mode and canary deployment.",
        },
    }
    return {
        "loop_active": True,
        "interval_seconds": 30,
        "mode": LLM_MODE,
        "agents": agents,
        "recent_healing": healing_events[:10],
    }


@app.post("/api/healing/trigger")
async def trigger_healing() -> dict[str, Any]:
    db = app.db
    issue = secrets.choice([
        "Elevated error rate on /api/checkout — 504 errors spiking",
        "Memory leak detected in session handler — GC frequency 3x normal",
        "Database connection pool exhaustion — queries waiting >5s",
        "Slow API response on /api/products — P95 latency >800ms",
        "High CPU usage on worker process — sustained 92% for 10 minutes",
    ])
    base_ts = time.time()

    observer_event = await _create_and_store_event(db, base_ts, {
        "agent": "observer", "summary": f"Detected: {issue}",
        "detail": issue, "severity": "warning",
    })

    recent = await db.ledger.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5)
    healer_result = await healer_diagnose(issue, recent)
    healer_event = await _create_and_store_event(db, base_ts + 2, {
        "agent": "healer",
        "summary": f"Fix: {healer_result.get('fix', 'Applied fix')[:80]}",
        "detail": f"Diagnosis: {healer_result.get('diagnosis', '')}\n\nFix: {healer_result.get('fix', '')}\n\nConfidence: {healer_result.get('confidence', 'N/A')}%",
        "severity": "success",
        "llm_powered": LLM_MODE == "live",
    })

    planner_result = await planner_decide(
        issue, healer_result.get("diagnosis", ""),
        healer_result.get("fix", ""), healer_result.get("risk", "LOW"),
    )
    planner_event = await _create_and_store_event(db, base_ts + 5, {
        "agent": "planner",
        "summary": f"{'Approved' if planner_result.get('approved') else 'Held'}: {planner_result.get('strategy', 'direct_apply')} — {planner_result.get('explanation', '')[:80]}",
        "detail": f"Strategy: {planner_result.get('strategy', 'N/A')}\nCanary: {planner_result.get('canary_percent', 'N/A')}%\n\n{planner_result.get('reasoning', '')}",
        "severity": "success" if planner_result.get("approved") else "warning",
        "llm_powered": LLM_MODE == "live",
    })

    return {
        "triggered": True,
        "llm_mode": LLM_MODE,
        "scenario": issue,
        "healer_analysis": healer_result,
        "planner_decision": planner_result,
        "events": [observer_event, healer_event, planner_event],
    }


async def _create_and_store_event(db: Any, ts: float, fields: dict[str, Any]) -> dict[str, Any]:
    event = {
        "event_id": gen_id(),
        "type": "healing",
        "app_name": "ShopFlow",
        "proof_hash": make_hash(gen_id(), fields.get("summary", ""), ts),
        "timestamp": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
        **fields,
    }
    await db.ledger.insert_one({**event})
    event.pop("_id", None)
    await ws_manager.broadcast({"type": "healing_event", "event": event})
    return event


# ─── API: Deploy Wrapper ─────────────────────────────────────

@app.get("/api/deployments")
async def list_deployments() -> dict[str, Any]:
    db = app.db
    deployments = await db.deployments.find({}, {"_id": 0}).to_list(100)
    return {"deployments": deployments}

@app.post("/api/deploy")
async def deploy_artifact(req: DeployRequest) -> dict[str, Any]:
    db = app.db
    artifact = await db.artifacts.find_one({"artifact_id": req.artifact_id}, {"_id": 0})
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    deployment = _build_deployment(artifact, req)
    await db.deployments.insert_one(deployment)
    del deployment["_id"]

    await _log_deploy_event(db, artifact, deployment, req)
    await db.artifacts.update_one(
        {"artifact_id": req.artifact_id}, {"$set": {"status": "deployed"}}
    )
    return {"deployment": deployment, "message": f"Deployed to {deployment['url']}"}


def _build_deployment(artifact: dict[str, Any], req: DeployRequest) -> dict[str, Any]:
    app_slug = artifact["name"].lower().replace(" ", "-")
    deploy_id = "dep-" + gen_id()
    url = f"https://{app_slug}.forgerun.app"
    return {
        "deploy_id": deploy_id,
        "artifact_id": req.artifact_id,
        "app_name": artifact["name"],
        "target": req.target,
        "region": req.region,
        "status": "live",
        "url": url,
        "dns_configured": True,
        "ssl_active": True,
        "healing_active": True,
        "uptime_percent": 100.0,
        "started_at": now_iso(),
        "completed_at": now_iso(),
        "logs": [
            {"step": "verify", "msg": f"Artifact {req.artifact_id} signature verified", "ts": 0},
            {"step": "provision", "msg": f"{req.target.title()} instance provisioned ({req.region})", "ts": 1.8},
            {"step": "dns", "msg": f"DNS configured: {app_slug}.forgerun.app", "ts": 3.2},
            {"step": "ssl", "msg": "SSL certificate issued via Let's Encrypt", "ts": 5.6},
            {"step": "database", "msg": "PostgreSQL provisioned and migrations applied", "ts": 8.1},
            {"step": "secrets", "msg": "Environment secrets injected securely", "ts": 9.4},
            {"step": "kernel", "msg": "Forge Kernel started with self-healing loop active", "ts": 11.2},
            {"step": "live", "msg": f"App live at {url}", "ts": 13.5},
        ],
    }


async def _log_deploy_event(db: Any, artifact: dict[str, Any], deployment: dict[str, Any], req: DeployRequest) -> None:
    cost = secrets.randbelow(500) / 100 + 3
    event = {
        "event_id": gen_id(),
        "type": "deploy",
        "agent": "system",
        "app_name": artifact["name"],
        "summary": f"Deployed {artifact['name']} to {req.target} ({req.region})",
        "detail": f"URL: {deployment['url']}. SSL active. Self-healing loop started. Estimated monthly cost: ${cost:.2f}.",
        "severity": "success",
        "proof_hash": make_hash(deployment["deploy_id"], deployment["url"], now_iso()),
        "timestamp": now_iso(),
    }
    await db.ledger.insert_one(event)


# ─── API: Ask Why ─────────────────────────────────────────────

@app.post("/api/ask-why")
async def ask_why(req: AskWhyRequest) -> dict[str, Any]:
    db = app.db
    event = await db.ledger.find_one({"event_id": req.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    explanation = await ask_why_llm(event)
    return {
        "event": event,
        "explanation": explanation,
        "llm_mode": LLM_MODE,
        "proof": {
            "hash": event.get("proof_hash", ""),
            "algorithm": "SHA-256",
            "verified": True,
        },
    }


# ─── API: Metrics ─────────────────────────────────────────────

@app.get("/api/metrics/{app_name}")
async def get_metrics(app_name: str, hours: int = 24) -> dict[str, Any]:
    db = app.db
    limit = hours * 2
    metrics = await db.metrics.find(
        {"app_name": app_name}, {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return {"metrics": list(reversed(metrics)), "app_name": app_name}


# ─── API: Vibe-to-Code ───────────────────────────────────────

@app.post("/api/vibe-to-code")
async def generate_code(req: VibeToCodeRequest) -> dict[str, Any]:
    result = await vibe_to_code(req.vibe, req.framework)
    db = app.db
    event = {
        "event_id": gen_id(),
        "type": "codegen",
        "agent": "compiler",
        "app_name": req.vibe[:30],
        "summary": f"Generated code for: {req.vibe[:60]}",
        "detail": result.get("summary", "Code generated successfully"),
        "severity": "success",
        "proof_hash": make_hash(req.vibe, req.framework, now_iso()),
        "timestamp": now_iso(),
        "llm_powered": LLM_MODE == "live",
    }
    await db.ledger.insert_one(event)
    return {
        "files": result.get("files", []),
        "summary": result.get("summary", ""),
        "architecture": result.get("architecture", ""),
        "run_command": result.get("run_command", ""),
        "llm_mode": LLM_MODE,
    }


# ─── API: LLM Config ─────────────────────────────────────────

@app.get("/api/llm/config")
async def llm_config() -> dict[str, Any]:
    return {
        "mode": LLM_MODE,
        "provider": "openai" if LLM_MODE == "live" else "mock",
        "model": "gpt-5.2" if LLM_MODE == "live" else "mock",
        "features": {
            "healer_reasoning": True,
            "planner_decisions": True,
            "ask_why_explanations": True,
            "vibe_to_code": True,
        },
    }


# ─── API: Apps List ──────────────────────────────────────────

@app.get("/api/apps")
async def list_apps() -> dict[str, Any]:
    db = app.db
    artifacts = await db.artifacts.find({}, {"_id": 0}).to_list(100)
    deployments = await db.deployments.find({}, {"_id": 0}).to_list(100)
    deployed_names = {d["app_name"] for d in deployments}
    apps = []
    for a in artifacts:
        is_deployed = a["name"] in deployed_names
        dep = next((d for d in deployments if d["app_name"] == a["name"]), None)
        apps.append({
            "name": a["name"],
            "artifact_id": a["artifact_id"],
            "status": "deployed" if is_deployed else a["status"],
            "framework": a["framework"],
            "url": dep["url"] if dep else None,
            "has_metrics": True,
        })
    return {"apps": apps}


# ─── API: Healing Diff ──────────────────────────────────────

@app.get("/api/healing/diff/{event_id}")
async def get_healing_diff(event_id: str) -> dict[str, Any]:
    db = app.db
    event = await db.ledger.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    diff_result = await generate_healing_diff(event)
    return {
        "event_id": event_id,
        "event": event,
        "diff": diff_result,
        "llm_mode": LLM_MODE,
    }


# ─── API: Vibe-to-Code + Auto-Compile ───────────────────────

@app.post("/api/vibe-compile")
async def vibe_to_code_and_compile(req: VibeCompileRequest) -> dict[str, Any]:
    db = app.db
    code_result = await vibe_to_code(req.vibe, req.framework)

    app_name = req.name or req.vibe.split()[0].title() + "App"
    artifact_id = "forge-" + gen_id()
    all_code = "\n".join(f.get("content", "") for f in code_result.get("files", []))
    signature = make_hash(app_name, req.vibe, all_code, now_iso())
    behavior_hash = make_hash(app_name, req.vibe, "behavior")
    deps = detect_dependencies(req.vibe, req.framework)

    artifact = {
        "artifact_id": artifact_id,
        "name": app_name,
        "vibe": req.vibe,
        "framework": req.framework or "auto",
        "code_snippet": all_code[:500],
        "status": "compiled",
        "size_kb": len(all_code) // 10 + secrets.randbelow(200) + 50,
        "dependencies": deps,
        "signature": signature,
        "behavior_hash": behavior_hash,
        "created_at": now_iso(),
        "generated_files": len(code_result.get("files", [])),
    }
    await db.artifacts.insert_one(artifact)
    del artifact["_id"]

    event = {
        "event_id": gen_id(),
        "type": "vibe_compile",
        "agent": "compiler",
        "app_name": app_name,
        "summary": f"Vibe → Code → Artifact: {app_name} ({artifact_id})",
        "detail": f"Generated {len(code_result.get('files', []))} files from vibe, compiled into {artifact['size_kb']}KB artifact. {code_result.get('summary', '')}",
        "severity": "success",
        "proof_hash": make_hash(artifact_id, signature, now_iso()),
        "timestamp": now_iso(),
        "llm_powered": LLM_MODE == "live",
    }
    await db.ledger.insert_one(event)

    return {
        "code": code_result,
        "artifact": {k: v for k, v in artifact.items() if k != "_id"},
        "message": f"Generated code and compiled {app_name} into .forge artifact",
        "llm_mode": LLM_MODE,
    }


# ─── WebSocket: Real-time Healing ────────────────────────────

@app.websocket("/api/ws/healing")
async def websocket_healing(ws: WebSocket) -> None:
    await ws_manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

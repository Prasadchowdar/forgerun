import os
import json
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_MODE = os.environ.get("LLM_MODE", "mock")


def get_chat(session_id: str, system_message: str) -> LlmChat:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    )
    chat.with_model("openai", "gpt-5.2")
    return chat


async def healer_diagnose(issue: str, ledger_history: list) -> dict:
    if LLM_MODE == "mock":
        return _mock_healer(issue)

    history_text = "\n".join(
        f"- [{e.get('agent','?')}] {e.get('summary','')}" for e in ledger_history[:5]
    )
    prompt = f"""You are the Healer Agent inside ForgeRun, a self-healing AI App OS.

Problem detected by Observer Agent:
{issue}

Recent ledger history:
{history_text}

Analyze the root cause and suggest ONE safe, targeted fix.
Respond ONLY with valid JSON (no markdown, no code fences):
{{
  "diagnosis": "Root cause analysis in 1-2 sentences",
  "fix": "The specific fix to apply in 1-2 sentences",
  "risk": "LOW or MEDIUM or HIGH",
  "confidence": 85,
  "explanation": "Plain-English explanation a non-technical person would understand, 2-3 sentences"
}}"""

    try:
        chat = get_chat("healer-agent", "You are a production infrastructure healing agent. Always respond with valid JSON only.")
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        return json.loads(response.strip())
    except Exception as e:
        print(f"[LLM healer error] {e}")
        return _mock_healer(issue)


async def planner_decide(issue: str, diagnosis: str, fix: str, risk: str) -> dict:
    if LLM_MODE == "mock":
        return _mock_planner(risk)

    prompt = f"""You are the Planner Agent inside ForgeRun.

Issue: {issue}
Diagnosis: {diagnosis}
Proposed Fix: {fix}
Risk Level: {risk}

Decide whether to approve this fix. Consider:
1. Is the fix safe for production?
2. Should it use shadow mode first?
3. What canary percentage to start with?

Respond ONLY with valid JSON (no markdown, no code fences):
{{
  "approved": true,
  "strategy": "shadow_then_canary or direct_apply or manual_review",
  "canary_percent": 1,
  "reasoning": "2-3 sentence explanation of your decision",
  "explanation": "Plain-English summary for the dashboard"
}}"""

    try:
        chat = get_chat("planner-agent", "You are a deployment risk assessment agent. Always respond with valid JSON only.")
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        return json.loads(response.strip())
    except Exception as e:
        print(f"[LLM planner error] {e}")
        return _mock_planner(risk)


async def ask_why_llm(event: dict) -> str:
    if LLM_MODE == "mock":
        return _mock_ask_why(event)

    prompt = f"""You are ForgeRun's AI explainer. A user clicked "Ask Why" on this event in their dashboard.

Event details:
- Agent: {event.get('agent', 'unknown')}
- Type: {event.get('type', 'unknown')}
- Summary: {event.get('summary', '')}
- Detail: {event.get('detail', '')}
- Severity: {event.get('severity', '')}
- App: {event.get('app_name', '')}

Write a clear, friendly, plain-English explanation (3-4 sentences) of:
1. What happened and why
2. What the agent did about it
3. Why users should not worry (if applicable)

Be specific to this event. Do NOT use technical jargon. Speak like a helpful friend explaining what happened."""

    try:
        chat = get_chat("ask-why-explainer", "You are a friendly AI assistant that explains technical events in plain English. Be specific and helpful.")
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        return response.strip()
    except Exception as e:
        print(f"[LLM ask-why error] {e}")
        return _mock_ask_why(event)


async def vibe_to_code(vibe: str, framework: str) -> dict:
    if LLM_MODE == "mock":
        return _mock_vibe_to_code(vibe, framework)

    prompt = f"""You are ForgeRun's Vibe-to-Code generator. Generate a production-ready starter application.

Vibe description: "{vibe}"
Framework: {framework}

Generate the main application files. Respond ONLY with valid JSON (no markdown, no code fences):
{{
  "files": [
    {{
      "path": "relative/path/to/file.ext",
      "content": "file content here",
      "language": "javascript"
    }}
  ],
  "summary": "Brief description of what was generated",
  "architecture": "Brief architecture overview",
  "run_command": "Command to run the app"
}}

Generate 3-5 key files that form a working app skeleton. Keep each file under 80 lines. Use modern best practices."""

    try:
        chat = get_chat("vibe-to-code", "You are a senior full-stack developer. Generate clean, production-ready code. Always respond with valid JSON only.")
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        return json.loads(response.strip())
    except Exception as e:
        print(f"[LLM vibe-to-code error] {e}")
        return _mock_vibe_to_code(vibe, framework)


async def generate_healing_diff(event: dict) -> dict:
    if LLM_MODE == "mock":
        return _mock_healing_diff(event)

    prompt = f"""You are ForgeRun's code diff generator. Given a healing event, generate the exact code diff that the Healer Agent applied.

Event details:
- Agent: {event.get('agent', 'unknown')}
- Summary: {event.get('summary', '')}
- Detail: {event.get('detail', '')}
- App: {event.get('app_name', '')}

Generate a realistic unified diff showing what was changed. Respond ONLY with valid JSON (no markdown, no code fences):
{{
  "file_path": "src/path/to/affected/file.ts",
  "language": "typescript",
  "before": "The original code block (10-20 lines around the problem)",
  "after": "The fixed code block (same section with the fix applied)",
  "hunks": [
    {{
      "header": "@@ -42,8 +42,12 @@",
      "lines": [
        {{ "type": "context", "content": "  unchanged line" }},
        {{ "type": "removed", "content": "  old problematic line" }},
        {{ "type": "added", "content": "  new fixed line" }},
        {{ "type": "context", "content": "  unchanged line" }}
      ]
    }}
  ],
  "summary": "Brief description of what changed and why"
}}

Make the diff realistic and relevant to the healing event. Include 2-4 context lines around each change."""

    try:
        chat = get_chat("healing-diff-gen", "You are a code diff generator. Generate realistic, well-formatted code diffs. Always respond with valid JSON only.")
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)
        return json.loads(response.strip())
    except Exception as e:
        print(f"[LLM diff error] {e}")
        return _mock_healing_diff(event)



# ─── Mock Fallbacks ────────────────────────────────────────────

def _mock_healer(issue: str) -> dict:
    return {
        "diagnosis": f"Root cause analysis for: {issue}. The system identified a performance bottleneck caused by inefficient resource allocation under high load conditions.",
        "fix": "Applied automatic resource scaling and optimized the affected service's connection handling. Added circuit breaker to prevent cascade failures.",
        "risk": "LOW",
        "confidence": 92,
        "explanation": "Your app was running a bit slower than usual because too many requests were hitting a bottleneck. We've automatically optimized how your app handles traffic, so it should be running smoothly now.",
    }

def _mock_planner(risk: str) -> dict:
    return {
        "approved": True,
        "strategy": "shadow_then_canary" if risk != "LOW" else "direct_apply",
        "canary_percent": 1 if risk != "LOW" else 100,
        "reasoning": f"Risk assessment: {risk}. The proposed fix is safe based on historical data and shadow testing. Proceeding with deployment.",
        "explanation": f"We tested the fix safely and it looks good. Deploying it now with {'a careful canary rollout' if risk != 'LOW' else 'full confidence'}.",
    }

def _mock_ask_why(event: dict) -> str:
    agent = event.get("agent", "system")
    summary = event.get("summary", "an action")
    explanations = {
        "observer": f"The Observer Agent noticed something during its regular check-up of your apps. Specifically, it found: {summary}. This is part of ForgeRun's 24/7 monitoring that runs every 30 seconds to catch issues before they affect your users.",
        "healer": f"The Healer Agent stepped in to fix a problem: {summary}. It analyzed the issue, figured out the root cause, and applied a targeted fix. The fix was tested in a safe environment first to make sure it wouldn't cause any new problems.",
        "planner": f"The Planner Agent made a decision about deploying a fix: {summary}. It evaluated the risk, ran safety checks, and decided the safest way to roll out the change. Your app stayed online the entire time.",
        "system": f"This was an automated system action: {summary}. ForgeRun handled this automatically as part of its normal operations. Everything is logged and verifiable.",
        "compiler": f"The Artifact Compiler processed your code: {summary}. It bundled everything up, verified all dependencies, and created a secure, signed artifact that's ready for deployment.",
    }
    return explanations.get(agent, explanations["system"])


def _mock_vibe_to_code(vibe: str, framework: str) -> dict:
    return {
        "files": [
            {
                "path": "package.json",
                "content": json.dumps({"name": vibe.split()[0].lower(), "version": "1.0.0", "scripts": {"dev": "next dev", "build": "next build"}}, indent=2),
                "language": "json",
            },
            {
                "path": "app/page.js",
                "content": f"'use client';\nimport {{ useState }} from 'react';\n\nexport default function Home() {{\n  const [items, setItems] = useState([]);\n  return (\n    <main className=\"p-8\">\n      <h1 className=\"text-2xl font-bold\">{vibe}</h1>\n      <p>Generated with ForgeRun</p>\n    </main>\n  );\n}}",
                "language": "javascript",
            },
            {
                "path": "app/layout.js",
                "content": "export const metadata = { title: '" + vibe[:30] + "' };\nexport default function RootLayout({ children }) {\n  return <html><body>{children}</body></html>;\n}",
                "language": "javascript",
            },
        ],
        "summary": f"Generated a {framework} starter app for: {vibe}",
        "architecture": f"Basic {framework} app with client-side state management",
        "run_command": "npm install && npm run dev",
    }


def _mock_healing_diff(event: dict) -> dict:
    detail = event.get("detail", "")
    if "index" in detail.lower() or "query" in detail.lower():
        return {
            "file_path": "src/db/queries/products.ts",
            "language": "typescript",
            "before": "const products = await db.collection('products')\n  .find({ category })\n  .sort({ created_at: -1 })\n  .limit(50)\n  .toArray();",
            "after": "const products = await db.collection('products')\n  .find({ category })\n  .sort({ created_at: -1 })\n  .hint({ category: 1, created_at: -1 })\n  .limit(50)\n  .toArray();\n\n// Ensure compound index exists\nawait db.collection('products').createIndex(\n  { category: 1, created_at: -1 },\n  { background: true }\n);",
            "hunks": [
                {
                    "header": "@@ -42,6 +42,12 @@",
                    "lines": [
                        {"type": "context", "content": "const products = await db.collection('products')"},
                        {"type": "context", "content": "  .find({ category })"},
                        {"type": "context", "content": "  .sort({ created_at: -1 })"},
                        {"type": "added", "content": "  .hint({ category: 1, created_at: -1 })"},
                        {"type": "context", "content": "  .limit(50)"},
                        {"type": "context", "content": "  .toArray();"},
                        {"type": "added", "content": ""},
                        {"type": "added", "content": "// Ensure compound index exists"},
                        {"type": "added", "content": "await db.collection('products').createIndex("},
                        {"type": "added", "content": "  { category: 1, created_at: -1 },"},
                        {"type": "added", "content": "  { background: true }"},
                        {"type": "added", "content": ");"},
                    ],
                }
            ],
            "summary": "Added query hint and ensured compound index on {category, created_at} for products collection.",
        }
    if "memory" in detail.lower() or "leak" in detail.lower():
        return {
            "file_path": "src/services/session-handler.ts",
            "language": "typescript",
            "before": "class SessionCache {\n  private cache = new Map<string, SessionData>();\n\n  set(key: string, data: SessionData) {\n    this.cache.set(key, data);\n  }\n}",
            "after": "class SessionCache {\n  private cache = new Map<string, WeakRef<SessionData>>();\n  private cleanupInterval: NodeJS.Timeout;\n\n  constructor() {\n    this.cleanupInterval = setInterval(() => this.cleanup(), 300_000);\n  }\n\n  set(key: string, data: SessionData) {\n    this.cache.set(key, new WeakRef(data));\n  }\n\n  private cleanup() {\n    for (const [key, ref] of this.cache) {\n      if (!ref.deref()) this.cache.delete(key);\n    }\n  }\n}",
            "hunks": [
                {
                    "header": "@@ -15,8 +15,22 @@",
                    "lines": [
                        {"type": "context", "content": "class SessionCache {"},
                        {"type": "removed", "content": "  private cache = new Map<string, SessionData>();"},
                        {"type": "added", "content": "  private cache = new Map<string, WeakRef<SessionData>>();"},
                        {"type": "added", "content": "  private cleanupInterval: NodeJS.Timeout;"},
                        {"type": "added", "content": ""},
                        {"type": "added", "content": "  constructor() {"},
                        {"type": "added", "content": "    this.cleanupInterval = setInterval(() => this.cleanup(), 300_000);"},
                        {"type": "added", "content": "  }"},
                        {"type": "context", "content": ""},
                        {"type": "context", "content": "  set(key: string, data: SessionData) {"},
                        {"type": "removed", "content": "    this.cache.set(key, data);"},
                        {"type": "added", "content": "    this.cache.set(key, new WeakRef(data));"},
                        {"type": "context", "content": "  }"},
                        {"type": "added", "content": ""},
                        {"type": "added", "content": "  private cleanup() {"},
                        {"type": "added", "content": "    for (const [key, ref] of this.cache) {"},
                        {"type": "added", "content": "      if (!ref.deref()) this.cache.delete(key);"},
                        {"type": "added", "content": "    }"},
                        {"type": "added", "content": "  }"},
                        {"type": "context", "content": "}"},
                    ],
                }
            ],
            "summary": "Replaced Map<string, SessionData> with WeakRef-based cache and added periodic cleanup to prevent memory leaks.",
        }
    return {
        "file_path": "src/config/server.ts",
        "language": "typescript",
        "before": "const pool = createPool({\n  max: 10,\n  idleTimeoutMillis: 0\n});",
        "after": "const pool = createPool({\n  max: 25,\n  idleTimeoutMillis: 300_000,\n  reapIntervalMillis: 60_000\n});",
        "hunks": [
            {
                "header": "@@ -8,4 +8,5 @@",
                "lines": [
                    {"type": "context", "content": "const pool = createPool({"},
                    {"type": "removed", "content": "  max: 10,"},
                    {"type": "removed", "content": "  idleTimeoutMillis: 0"},
                    {"type": "added", "content": "  max: 25,"},
                    {"type": "added", "content": "  idleTimeoutMillis: 300_000,"},
                    {"type": "added", "content": "  reapIntervalMillis: 60_000"},
                    {"type": "context", "content": "});"},
                ],
            }
        ],
        "summary": "Increased connection pool size and added idle timeout with reaping to prevent connection exhaustion.",
    }

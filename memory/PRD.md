# ForgeRun — Self-Healing AI App OS

## Problem Statement
Build a full web-based ForgeRun Dashboard & Platform showcasing 5 layers: Artifact Compiler, Verifiable Ledger, Self-Healing Loop (Observer/Healer/Planner agents), Deploy Wrapper, and Plain-English Dashboard. Real LLM integration, WebSocket updates, code generation.

## Architecture
- **Backend**: FastAPI (Python) on port 8001 | `secrets` module for security | Type-hinted
- **Frontend**: React 18 + Tailwind CSS on port 3000 | useMemo/useCallback optimized
- **Database**: MongoDB (forgerun DB)
- **LLM**: GPT-5.2 via Emergent Integration Library (pluggable mock/live)
- **Real-time**: WebSocket at /api/ws/healing
- **Design**: Dark Swiss-themed, Chivo/IBM Plex Sans/JetBrains Mono

## What's Been Implemented

### Iteration 1 (Jan 2026) — MVP
- Full backend with 12 API endpoints, React frontend with 5 views
- Demo data seeded, all tests passing (17/17)

### Iteration 2 (Jan 2026) — LLM + WebSocket + Vibe-to-Code
- GPT-5.2 integration for Healer/Planner/AskWhy/CodeGen
- WebSocket real-time healing events
- Vibe-to-Code page with file tabs viewer
- All tests passing (6/6 new)

### Iteration 3 (Jan 2026) — Code Quality Refactor
- **Security**: Replaced `random` with `secrets` module (5 instances)
- **Decomposition**: Split seed_demo_data into 4 functions, trigger_healing extracted helper, deploy split into builder+logger
- **Type Hints**: Full type annotations on all backend functions
- **React Hooks**: Fixed useCallback/useEffect dependencies across 6 components
- **Performance**: Added useMemo for chart data, traffic data, WS events filtering
- **Stable Keys**: Replaced array index keys with event_id/file.path/deploy_id
- **Error Handling**: Replaced empty catch blocks with console.error logging
- **Component Extraction**: PerformanceChart, TrafficChart, TerminalOutput, DeploymentsList, LedgerEvent, HealingEventRow, TriggerEventCard
- Bug fixed: VibeToCode.js idx undefined (found by testing agent)
- All tests passing (23/23 backend, all frontend)

## Backlog
### P0 (Next)
- Multi-app real-time metrics switching
- Code diff viewer for healing patches

### P1
- RBAC / team access
- Export .forge artifacts
- Cost optimizer with AI recommendations

### P2
- Marketplace for .forge artifacts
- GitHub/GitLab integration

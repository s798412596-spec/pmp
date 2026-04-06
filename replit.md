# PMP — 新媒体运营管理系统

React + Vite SPA for 第二座山集团. Manages social media projects, recurring tasks, deliverables, staff, risk registers, and Gantt charts, backed by Supabase for auth, realtime sync, and file storage.

## Tech Stack
- **Frontend**: React 18, Vite 8, Recharts, lucide-react
- **Backend**: Supabase (auth, Postgres via `app_data` table, Edge Functions)
- **AI**: Gemini (default) + Qwen (DashScope) + OpenAI / DeepSeek / Anthropic / GLM, via `supabase/functions/ai-proxy` edge function

## Key Files
- `src/App.jsx` — entire frontend (single file, ~4300 lines)
- `src/supabase.js` — Supabase client + TABLE constant
- `vite.config.js` — Vite config with host allowances
- `supabase/functions/ai-proxy/index.ts` — AI proxy edge function (4-stage pipeline)

## Data Storage
- `localStorage` key: `sm-ops-v6` (SK) — offline/fast cache
- Supabase table: `app_data` with `id="main"` row containing full data JSON
- `DEFAULT_DATA` shape: `{ projects, staff, weekSchedules, customTags, ... }`

## AI Agent Pipeline (4-stage)
Commander → Architect → 工时分析者 → 会议解析者（标签）

| Stage | Role | Timeout |
|---|---|---|
| Commander | Routes long inputs (>400 chars) to per-project buckets | 10s |
| Architect | Maps text → 4-layer structure (Project→Category→Resource→Action) | 45s |
| 工时分析者 | Estimates hours for new actions | 20s |
| 会议解析者 | Auto-assigns/creates tags for newly created categories (non-fatal) | 15s |

- **Auth**: edge function always uses `AI_ANON_KEY`, never user JWT
- **Frontend auth soft-check**: `supabase.auth.getSession()` with 15s timeout (raised from 5s in Task #16 to handle token refresh latency)
- **Client abort**: `AI_CLIENT_TIMEOUT_MS = 40000`

## AI Operations (Architect output — `operations[]`)
| Type | Purpose |
|---|---|
| `add_project` | Create new project with full L2→L4 tree |
| `add_category` | Add category to existing project |
| `add_resource` | Add resource to existing category |
| `add_action` | Add action to existing resource |
| `delete_action` / `delete_resource` / `delete_project` | Remove items |
| `update_action` | Modify action fields (staffId, deadline, hours, etc.) |
| `delay_action` | Postpone an action's deadline by N days (name+staffName+projectName matching) |
| `add_tag` | Create new custom tag (name + color) |
| `assign_tag` | Assign tag to a newly created category (by `_tempId` from backend) |

## Custom Tag System (Task #13)
- `customTags: [{id, name, color}]` stored in top-level data
- `INITIAL_TAGS` (15 tags) seeded via `DEFAULT_DATA` for new/existing users
- `getCatColor(cat, customTags)` helper — falls back to hardcoded `CAT_COLORS`
- Tag management UI in `ProjectsView` (collapsible section, inline edit, color picker)
- `CatForm` uses dynamic `customTags` list; `TAG_PALETTE` 10 colors
- AI system prompt dynamically injects current tag names list
- `RES_TYPES` expanded: 5→11 (added: `ad_account`, `kol`, `creative`, `document`, `data`, `event`)
- `PLATFORMS` expanded: 8→14

## AI 会议解析者 — Tag Auto-Classifier (Task #14)
- Stage 4 runs automatically after Architect when new categories are created
- Backend assigns temp IDs (`tmpcat-0`, `tmpcat-1`, …) to new categories **before** calling Tag Analyzer
- LLM returns `assign_tag` ops keyed by `categoryId` (temp ID) — deterministic, no name ambiguity
- Frontend `applyOperations` resolves temp IDs to real category IDs; strips `_tempId` from stored data
- `createdCategoryIds` Set scopes `assign_tag` to current batch only — no historical category retagging
- `add_tag` dedup: normalized (trim + case-fold) before comparison
- Loading hint: "🏷️ 标签解析者归类中…" shown when tag ops present

## Task Delay Button (Task #15)
- **Manual (admin panel → 任务筛选)**: amber 「延期」button on each `aType === "once"` task with a `deadline`
- Dropdown: +1天 … +5天; click-outside via fixed invisible overlay (z:199 backdrop, z:200 dropdown)
- Uses local date arithmetic `new Date(y, m-1, day+N)` — no UTC/DST offset issues
- Writes `auditLog` entry: `type="update"`, `field="deadline"`, before/after values
- **Via AI chat**: say "把某人的某任务推迟N天" → AI returns `delay_action` op
  - Matches by `actionName` + optional `staffName` + optional `projectName`
  - Only applies to `aType === "once"` actions with a `deadline`
  - OpCard preview: amber border, "+N天" badge

## LocalStorage Keys
- `sm-ai-config` — AI provider/model config
- `sm-agent-mode` — Commander agent toggle
- `sm-hours-analyst` — hours analyst toggle
- `sm-ai-chat` — chat messages
- `sm-ai-history` — chat history

## Supabase Project
- Project ref: `divinifsucffsxyiyypc`
- Auth: phone@pmp.local fake email pattern
- `OPENAI_API_KEY` env var used by both GPT and Qwen (DashScope)
- `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `GLM_API_KEY`, `ANTHROPIC_API_KEY` — optional per provider

## Critical Implementation Notes
- **Edge function auth**: `callEdgeFn` ALWAYS uses `AI_ANON_KEY` — never user JWT. Do NOT revert.
- **`add_project` handler**: uses `c._tempId || uid()` as category ID; strips `_tempId` from stored object
- **`assign_tag` handler**: primary match by `c.id === op.categoryId`; fallback by name within `createdCategoryIds`
- **Tag dedup**: `add_tag` normalizes names (trim + toLowerCase) before checking for duplicates
- **Delay date math**: always use `new Date(y, m-1, day+N)` with local parts — never `toISOString().slice(0,10)`
- **Btn component**: use `v="success"` for green; never inline bg override

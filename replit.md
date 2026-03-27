# ReMynd Assessment Operating System (RAOS)

## Overview

Full-stack psychoeducational assessment management platform built as a pnpm monorepo. The system manages the complete lifecycle of student assessment cases through 9 phases, from parent intake to final debrief.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/raos)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT Bearer token (stored in localStorage), SHA-256 password hashing
- **AI**: DeepSeek via DEEPSEEK_API_KEY (intake analysis, tool recommendations, report generation, Korean translations)
- **Charts**: Recharts (radar charts, bar charts for scoring)
- **QR codes**: qrcode.react

## Structure

```
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── raos/               # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/seed.ts         # Database seed script
└── pnpm-workspace.yaml
```

## Roles

- **Admin (Noel)** — admin@remynd.com / password — Full access, case creation, report approval
- **Assessment Lead (Hayley)** — hayley@remynd.com / password — Communication, scheduling, self-report administration
- **Psychometrician (Abegail)** — abegail@remynd.com / password — Scoring queue

## System Modules

1. **Case Creation** — Admin creates student cases with team assignment
2. **Consent + Parent Intake** — Digital forms via QR/link
3. **AI Intake Analysis** — Gemini analyzes referral data, recommends domains and risk level
4. **Assessment Builder** — Select from ReMynd tools (RCS-80, RASR, RARI, REFI, RERMS, RSCP, RARPS, RFII, CDP battery) or external standardized tools (Conners, BRIEF, BASC)
5. **Multi-Respondent Deployment** — Generate unique tokenized links + QR codes for Parent, Teacher 1, Teacher 2, Student
6. **Form Completion Monitor** — Dashboard with status tracking (not_started, in_progress, completed, overdue)
7. **Self-Report Admin** — Guided administration mode with language toggle (English/Mandarin/Cantonese)
8. **Scoring Engine** — Auto-scoring for ReMynd tools, manual entry for external tools, teacher agreement index
9. **AI Report Generator** — Gemini generates full Educational Profile & Support Plan
10. **Admin Review Panel** — Edit report sections, add notes, approve
11. **Export** — PDF/DOCX export

## Case Phases (9 phases)

pre_commitment → intake → setup → forms → assessment → scoring → report → debrief → complete

## Database Schema

- **users** — Internal staff (admin, assessment_lead, psychometrician)
- **cases** — Student case records with phase tracking
- **assessment_tools** — Tool catalog (ReMynd + external). 31 canonical tools (22 original + 6 BASC-3 + 3 BRIEF-2)
- **batteries** — Assessment batteries grouping multiple tools (e.g., CDP battery, BASC-3 battery, BRIEF-2 battery)
- **assignments** — Per-respondent assignments with unique tokens + QR codes
- **responses** — Form submissions from respondents
- **scores** — Domain scores + cross-informant aggregation
- **reports** — AI-generated report sections with approval workflow

## CDP Battery (ReMynd Child Development Profile)

4-form parent/teacher-completed battery:
- **CDP-CL** — Cognition & Learning (98 items, 7 domains: organization_planning, working_memory, reasoning, applied_academic, time_measurement, social_cognitive, independence)
- **CDP-SI** — Social Interaction & Awareness (74 items, 7 domains: peer_interaction, safety_awareness, empathy_emotions, social_norms, self_advocacy, friendship, conflict_resolution)
- **CDP-SR** — Self-Regulation & Executive Function (67 items, 8 domains: managing_emotions, adaptive_behavior, managing_stress, coping_with_change, physical_wellness, social_interaction, executive_functioning, metacognition)
- **CDP-CI** — Communication & Interaction (63 items, 8 domains: attention_listening, gestural_cues, comprehension, expressive_communication, social_skills, social_awareness, social_initiation, strengths)

Scale: Always/Often/Rarely/Never = 3/2/1/0. Higher = better (ability-based).
Thresholds: ≥75% Typical, 50–74% Mild Concern, 25–49% Moderate Concern, <25% Significant Concern.
CDP Profile page: `/cases/:id/cdp` — shows domain scores with severity bands per form.

## BASC-3 Battery (Behavior Assessment System for Children, 3rd Edition)

6-form third-party battery (external scoring via BASC-3 ASSIST software):
- **BASC3-TRS-A** — Teacher Rating Scales, Adolescent 12–21 (165 items, N/S/O/A scale)
- **BASC3-PRS-A** — Parent Rating Scales, Adolescent 12–21 (173 items, N/S/O/A scale)
- **BASC3-TRS-C** — Teacher Rating Scales, Child 6–11 (156 items, N/S/O/A scale)
- **BASC3-PRS-C** — Parent Rating Scales, Child 6–11 (175 items, N/S/O/A scale)
- **BASC3-SRP-A** — Self-Report of Personality, Adolescent 12–21 (189 items: 59 T/F + 130 N/S/O/A)
- **BASC3-SRP-C** — Self-Report of Personality, Child 8–11 (137 items: 42 T/F + 95 N/S/O/A)

Chinese translations embedded in all items. Korean auto-translated by DeepSeek on first server start.
Source: `artifacts/api-server/src/lib/basc3.ts`

## BRIEF-2 Battery (Behavior Rating Inventory of Executive Function, 2nd Edition)

3-form third-party battery (external scoring via BRIEF-2 software):
- **BRIEF2-P** — Parent Form, Ages 5–18 (63 items, N/S/O scale)
- **BRIEF2-SR** — Self-Report Form, Ages 11–18 (55 items, N/S/O scale)
- **BRIEF2-T** — Teacher Form, Ages 5–18 (63 items, N/S/O scale)

Chinese translations embedded in all items. Korean auto-translated by DeepSeek on first server start.
Source: `artifacts/api-server/src/lib/brief2.ts`

## External Respondent Access

- No login required
- Access via: `/external/:token`
- Token stored in `assignments.unique_token`
- Mobile-friendly form with language toggle

## Key Commands

```bash
pnpm --filter @workspace/api-spec run codegen    # Regenerate API client
pnpm --filter @workspace/db run push             # Push DB schema changes
pnpm --filter @workspace/scripts run seed        # Seed initial data
pnpm --filter @workspace/api-server run build    # Build API server
```

## AI Integration

- **CRITICAL: DeepSeek ONLY for all AI features** (never OpenAI or Gemini)
- Environment variable: DEEPSEEK_API_KEY (available as secret)
- Used for: intake analysis, tool recommendations, report generation
- Fallback responses if AI fails (no hard crash)

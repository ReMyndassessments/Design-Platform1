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
- **AI**: Gemini via Replit AI Integrations (intake analysis, tool recommendations, report generation)
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
4. **Assessment Builder** — Select from ReMynd tools (RCS-80, RASR, RARI, REFI, RERMS, RSCP, RARPS, RFII) or external standardized tools (Conners, BRIEF, BASC)
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
- **assessment_tools** — Tool catalog (ReMynd + external)
- **assignments** — Per-respondent assignments with unique tokens + QR codes
- **responses** — Form submissions from respondents
- **scores** — Domain scores + cross-informant aggregation
- **reports** — AI-generated report sections with approval workflow

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

- Gemini via Replit AI Integrations (no own API key needed)
- Environment variables: AI_INTEGRATIONS_GEMINI_BASE_URL, AI_INTEGRATIONS_GEMINI_API_KEY
- Used for: intake analysis, tool recommendations, report generation
- Fallback responses if AI fails (no hard crash)

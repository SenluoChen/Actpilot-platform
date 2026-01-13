**ActPilot - AI Act Risk Checker & Annex IV Generator**

https://github.com/user-attachments/assets/8ff16c20-dbe6-424f-a7bc-9c8ab1f34942


ActPilot is an **RegTech MVP** designed to help startups and SMEs assess their AI systems under the **EU AI Act** and generate structured compliance documentation (**Annex IV**). The platform focuses on **risk classification**, **document generation**, and **human-in-the-loop AI assistance**, without replacing legal or regulatory decision-making.

The project is built as a full-stack cloud application with a modern React frontend and a serverless AWS backend deployed via infrastructure as code.


## Project Goals

- Provide a fast, structured **AI Act risk self-assessment**
- Generate **Annex IV documentation drafts** from structured inputs and **AI Prefill**
- Offer a scalable and auditable cloud architecture suitable for B2B SaaS

---

## Key Features

- **AI Prefill (document-to-form)** — Automatically extract relevant information from uploaded supporting documents and pre-fill Annex IV fields; users review and finalize the draft.
- **AI Act risk classification** — Guided questionnaires and classification logic aligned with EU AI Act risk tiers.
- **Annex IV document generation** — Form-driven mapping to Annex IV sections with LLM-assisted drafting and rewrite.
- **Export** — PDF and DOCX export of generated drafts.

---

## Repository Structure

```text
.
├─ frontend/                  # Vite + React + TypeScript UI
│  ├─ src/
│  │  ├─ auth/                # Cognito authentication
│  │  ├─ annex/               # Annex IV domain logic
│  │  ├─ riskChecker/         # AI Act risk checker UI
│  │  ├─ components/          # Shared UI components
│  │  └─ pages/               # Page-level views
│  └─ public/
│
├─ backend/                   # Serverless backend + infrastructure
│  ├─ bin/                    # CDK app entry
│  ├─ lib/                    # CDK stacks (API, storage, frontend hosting)
│  ├─ lambda/
│  │  ├─ api/                 # HTTP handlers (thin controllers)
│  │  ├─ usecases/            # Core business logic (pure TypeScript)
│  │  └─ infra/               # AWS adapters (DynamoDB, S3, env)
│  ├─ scripts/                # Local tests and smoke checks
+│  └─ README.md               # Backend-specific documentation
│
└─ README.md                  # Project overview (this file)
```

---

## Local Development

### Frontend (local)

```bash
cd frontend
npm install
npm run dev
```

The frontend runs locally using Vite and connects to either mocked APIs or deployed backend endpoints depending on environment variables.

### Backend (local / build)

```bash
cd backend
npm install
npm run build
```

---

## Deploy (cloud)

Deploy the backend (CDK):

```bash
cd backend
npx cdk bootstrap
npm run deploy
```

To build and publish the frontend via the CDK stack:

```bash
cd backend
npm run deploy:frontend
```

What the deploy creates:

- API Gateway + Lambda functions
- DynamoDB tables
- S3 buckets (frontend hosting)
- CloudFront distribution (if enabled)
- IAM roles and permissions required by the stack

---

## Environment Variables

- Frontend: see `frontend/.env.example` and `frontend/.env.local` (API URL, Cognito IDs, other envs).
- Backend: see `backend/.env.example`.

Sensitive values (API keys, secrets) must not be committed - use AWS SSM / Secrets Manager for production secrets.

---

## Architecture Notes

- Clear separation of concerns: `lambda/api` (HTTP handlers) → `lambda/usecases` (business logic) → `lambda/infra` (AWS adapters).
- Business logic is framework-agnostic and testable in `usecases/`.
- Frontend is a static SPA; optional S3 + CloudFront hosting is supported by CDK.

---

## Documentation

- Backend deployment & infra: `backend/README.md`
- Frontend setup & env: `frontend/README.md`

---

## Repository Management

- Frontend and backend are self-contained projects within this monorepo.
- Root `package.json` contains convenience scripts only.
- Build artifacts and local files are ignored via `.gitignore`.

Optional: split into two GitHub repositories using `git subtree`:

```bash
git subtree split --prefix frontend -b split/frontend
git subtree split --prefix backend -b split/backend
```

---

## Disclaimer

This project provides assistive tooling only. It does not provide legal advice, certification, or automated regulatory decisions. Final responsibility for compliance remains with the user.

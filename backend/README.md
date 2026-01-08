# Backend (API + CDK Infra)

This folder is a standalone backend project (TypeScript) that also owns the AWS CDK stacks for **backend** and **frontend hosting (S3 + CloudFront)**.

## Structure

```
lambda/
  api/        # Lambda handlers (request/response only)
  usecases/   # Core business logic (pure TS)
  infra/      # AWS adapters (S3, DDB, env)
lib/          # CDK stacks (API GW, API Key, S3, DDB, Lambda, CloudFront)
```

## Install

```bash
cd backend
npm install
```

## Deploy (backend)

First-time per account/region:

```bash
cd backend
npx cdk bootstrap
```

Deploy:

```bash
cd backend
npm run deploy
```

Deployment outputs include: `ApiBaseUrl`, `BucketName`, `TableName`, `ApiKeyId` (API Key value is visible in AWS Console).

## Deploy (frontend hosting)

Frontend is deployed via the CDK stack `AiActLayeredFrontend`.

1) Configure Vite build-time env vars (recommended via `frontend/.env.production` or CI env vars):

- `VITE_API_BASE_URL`: backend `ApiBaseUrl` (e.g. `https://xxxx.execute-api.<region>.amazonaws.com/prod/`)
- `VITE_AWS_REGION`: e.g. `eu-west-3`
- `VITE_COGNITO_CLIENT_ID`: CDK output `CognitoUserPoolClientId`
- `VITE_API_KEY`: API Gateway `x-api-key`

2) Deploy:

```bash
cd backend
npm run deploy:frontend
```

CloudFormation will output `FrontendUrl`.

## Local smoke tests

```bash
API="https://xxx.execute-api.<region>.amazonaws.com/prod"
KEY="<your_api_key>"

curl -X POST "$API/submit" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"company":"ABC Tech","email":"info@abc.com","useCase":"Recrutement","dataSource":"CV + LinkedIn","hasHumanSupervision":true}'

curl "$API/verify?id=<statementId>&hash=<hash>"
curl "$API/statements?company=ABC%20Tech" -H "x-api-key: $KEY"
```

## Parser (folder upload → extraction → Annex IV rewrite)

- Copy `backend/.env.example` to `backend/.env` and fill `OPENAI_API_KEY` (do not commit)
- Local test script:

```bash
cd backend
npx ts-node scripts/run-api-parser-openai-test.ts
```

If you see `facts[].source === "ai"`, LLM calls are working.

## Local PDF generation (no AWS)

```bash
cd backend
npm run local
```

This generates a local PDF output (ignored by git).

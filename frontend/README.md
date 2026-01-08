# Frontend (portable)

This folder is a standalone frontend you can copy to another repo later.

## Setup

```bash
cd frontend
npm install
```

Option A) Use env vars:

- Copy `.env.example` to `.env.local` and fill values.

The app reads `VITE_API_BASE_URL` at startup.

## Run

```bash
npm run dev
```

Then open the printed URL (usually `http://localhost:5173`).

## Notes

- Backend routes used: `/parser/upload-folder`, `/annex/compose`, `/annex/render` (and others depending on your UI actions).

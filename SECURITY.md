# Security guidance

This repository contains infrastructure and lambda code for the AI Act MVP. Before pushing to a public GitHub repository, follow these rules to avoid leaking secrets or sensitive artifacts:

- Never commit secrets (API keys, JWT signing secrets, PEM/private keys, or AWS credentials).
- Keep runtime secrets in AWS Secrets Manager or other secret stores; reference them via environment variables or IAM roles — do not commit them.
- Do not commit generated artifacts that may contain sensitive data, e.g. `statement.pdf`, `token-out.json`, or base64 dumps. They are listed in `.gitignore`.
- Protect token issuance endpoints (TokenIssuer). In production, restrict access to TokenIssuer (IAM or Cognito-protected endpoint) or issue tokens from a secure backend only.

Pre-push checklist:
- Run `scripts\scrub-sensitive.ps1` to move common local secrets/artifacts into `secret-backup/`.
- Ensure `.env` is not tracked. Use `.env.example` as a template.
- Verify `git status` shows no secrets staged before `git add`.

If you find a secret committed in the repo history, rotate it immediately and remove the secret from history using tools like `git filter-repo`.

Pre-push guide

Quick steps to safely push this project to GitHub:

1. Run the scrub script (PowerShell):
   .\scripts\scrub-sensitive.ps1

2. Verify git status and that no sensitive files are present:
   git status

3. Commit and push as usual:
   git add .
   git commit -m "chore: initial public repo cleanup"
   git push origin main

Notes:
- If you use a different shell (bash), you can inspect `scripts/scrub-sensitive.ps1` and perform the equivalent moves manually.
- Add any additional local files you don't want committed to `.gitignore` before pushing.

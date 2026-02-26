# Frontend Polish Design — AdmitGuard
**Date:** 2026-02-26

## Scope
Production-quality demo polish across 3 parts: splash screen, exception UI removal, governance badge.

## Part 1 — SplashScreen
- New `src/ui/components/SplashScreen.js` using Anime.js
- Timeline: logo fade+scale (0–800ms) → underline draw (800–2000ms) → glow pulse (2000–2800ms) → screen fade-out (2800–3000ms)
- `main.js` defers App mount until splash completes

## Part 2 — Remove Manual Exception UI
- `InputField.js`: remove exception toggle + rationale textarea; show amber helper text for soft violations
- `FormStateManager.js`: auto-grant exceptionRequested+rationaleValid for engine-detected soft violations
- Submission gate stays strictly-driven; soft violations never block

## Part 3 — ComplianceStatusBadge
- New `src/ui/components/ComplianceStatusBadge.js`
- Green "Compliant" (0 exceptions) / Amber "Soft-rule review" (1–2) / Red "Flagged" (≥3)
- Replaces ExceptionCounter in app.js

## Files
New: SplashScreen.js, ComplianceStatusBadge.js, splash.css, badge.css, docs/plans/this-file.md
Modified: main.js, FormStateManager.js, InputField.js, input.css, app.js, index.html

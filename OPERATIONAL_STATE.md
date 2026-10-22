# THRESHOLD — Operational State
Revision: 1
Project: westkitty/THRESHOLD
Source of truth: THRESHOLD.html; PROMPT.md governs the literal original 25 questions.

## Purpose and immutable boundaries
- Four-round questionnaire, exactly 25 original questions verbatim, 50 original limit topics.
- Preserve all existing answer controls, classifications, custom topics, note fields, import/export, encrypted .thx backup, resume, session drawer, Signal Deck, print, and static dossier.
- Do not add or alter consent elements, auto-save sensitive answers without opt-in, introduce network submission or analytics, or commit real responses.
- The public GitHub Pages site serves only blank app code and icons. This is not an account, synchronization, or storage service.

## Build contract
- The offline standalone file THRESHOLD.html remains usable directly as a local file.
- The Pages PWA is generated deterministically from that exact file by tools/build-pages.mjs; dist/index.html adds only manifest, icons, install help, stylesheet, and SW registration.
- The published site uses GitHub Actions to upload dist/ only; neither README, PROMPT.md nor tests are served by the Pages deployment artifact.
- Scope and start path are ./ for project Pages at /THRESHOLD/.
- The service worker caches only nine known application shell URLs, including the root and index path; never participant answers or exported files.
- Updates do not force reload or overwrite active answers. New app code is visible on the next navigation/reopening.
- localStorage opt-in remains off by default, per origin. Switching from file:// to https:// requires user-initiated JSON/THX export and restore.

## Evidence / status
- 2026-10-22 baseline: GitHub default branch main, publicly visible, Pages previously not enabled; no operational-state file existed.
- Existing offline source unit check passed: node tests/verify.mjs.
- Existing Chrome CDP suite could not initialize a page in current Mac environment; browser-level acceptance is unverified until another browser environment or physical device is tested.
- PWA source and simulated service worker checks: node tools/build-pages.mjs; node tests/pwa.mjs (passed before committing).
- Physical iPhone Safari install, Home Screen persistence, and real airplane-mode behavior require manual verification. Do not claim those as tested.

## Release checks
1. node tests/verify.mjs
2. node tools/build-pages.mjs
3. node tests/pwa.mjs
4. GitHub Actions Pages build/deploy success, published path responds with HTML, manifest, SW and icons.
5. Manual iPhone: Safari -> Share -> Add to Home Screen -> Open as Web App; complete/export and re-open offline.

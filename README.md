# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Build 0.11 — Submission Candidate

This build freezes gameplay scope and focuses on a clean judge path plus production deployment.

### Experience

- Place a glowing seed on a real tabletop using gaze + either controller trigger or either-hand pinch
- After 8 seconds without a usable flat surface, offer an optional viewer-relative fallback; the player can keep searching indefinitely or pinch with either hand to place the village in front
- Watch a miniature civilization grow
- Interact with citizens using pinch/select hold
- React to a storm warning
- Protect the village with either open hand
- Reach a clear VILLAGE SAVED or VILLAGE DAMAGED ending
- XR-native onboarding and status panels
- Procedural audio and lightweight Quest-friendly visuals

### Submission timing

The calm phase remains long enough for a first-time judge to discover and grab a citizen before the storm begins. Build 0.10 removes two judge-environment failure modes without taking control away from the player: no detected tabletop gets an optional fallback, and shielding works with either hand.

## Local run

```powershell
cd C:\Users\dmano\Desktop\DESKBORN-LIVE
git pull
npm install
npm run typecheck
npm run build
npm run dev
```

## Production build

The IWSDK emulator remains available during development, but `injectOnBuild` is disabled so production builds do not bundle the development emulator environments.

```powershell
npm run typecheck
npm run build
```

The static production output is written to `dist/`.

## Public deployment

A GitHub Pages workflow is included in:

`.github/workflows/deploy-pages.yml`

After GitHub Pages is configured to use **GitHub Actions**, every push to `main` builds, typechecks and deploys `dist/`.

Expected project URL:

`https://roy0x.github.io/DESKBORN/`

Do not use that URL in the hackathon submission until the workflow has completed successfully and the XR experience has been tested from the public URL.

## Final acceptance test

1. Open the public HTTPS URL.
2. Enter XR.
3. Place the village on a horizontal surface.
4. Grab and release one citizen.
5. Confirm storm warning appears.
6. Complete a protected run and verify VILLAGE SAVED.
7. Reload/reset and verify VILLAGE DAMAGED without protection.
8. Confirm no missing assets or major console errors.
9. Record the final demo from this frozen build.

## Stack

Meta IWSDK · WebXR · TypeScript · Three.js · Vite

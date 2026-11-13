# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Build 0.8 — Submission Candidate

This build freezes gameplay scope and focuses on a clean judge path plus production deployment.

### Experience

- Place a glowing seed on a real tabletop
- Watch a miniature civilization grow
- Interact with citizens using pinch/select hold
- React to a storm warning
- Protect the village with an open hand
- Reach a clear VILLAGE SAVED or VILLAGE DAMAGED ending
- XR-native onboarding and status panels
- Procedural audio and lightweight Quest-friendly visuals

### Submission timing

The calm phase is intentionally longer in 0.7 so a first-time judge has time to discover and grab a citizen before the storm begins.

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

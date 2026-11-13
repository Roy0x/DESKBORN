# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Current build: 0.6 — Polish + Performance

Build 0.6 keeps the verified gameplay and improves what a judge immediately sees and feels.

### Added

- Richer miniature village with a stone path, central well and glowing crystals
- Lightweight procedural audio for planting, grabbing, storm warning, storm start, success and failure
- Stronger event feedback without external audio assets
- Reduced storm geometry cost for Quest-friendly rendering
- Citizen shadows disabled to remove unnecessary per-frame shadow work
- Existing XR-native onboarding and result panels retained

### Verified gameplay target

- Surface placement
- Seed planting
- Village growth
- Autonomous citizens
- Citizen hover / grab / move / release
- Storm warning and panic
- Open-hand shield
- VILLAGE SAVED / VILLAGE DAMAGED
- Reset and replay

## Update and run

```powershell
cd C:\Users\dmano\Desktop\DESKBORN-LIVE
git pull
npm install
npm run typecheck
npm run build
npm run dev
```

After dependencies are unchanged:

```powershell
cd C:\Users\dmano\Desktop\DESKBORN-LIVE
git pull
npm run dev
```

## Build 0.6 check

1. Plant the village and confirm the new path, well and glowing crystals are visible.
2. Confirm planting plays a short growth tone after browser audio is unlocked.
3. Grab a citizen and confirm a subtle grab tone.
4. Wait for the storm and confirm warning/start audio.
5. Complete a protected run and confirm success audio + VILLAGE SAVED.
6. Reset and fail the storm once to confirm failure audio + VILLAGE DAMAGED.
7. Verify there are no new console errors.

## Stack

Meta IWSDK · WebXR · TypeScript · Three.js · Vite

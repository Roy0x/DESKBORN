# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Current build: Day 2 — Surface Placement

- Meta IWSDK / WebXR
- Mixed-reality passthrough
- Environment raycast / hit-test
- Green placement reticle on valid horizontal surfaces
- Red reticle on steep/vertical surfaces
- Trigger/select plants the seed
- Miniature village grows at the selected surface
- Lightweight procedural Three.js visuals

## Run locally

```powershell
npm install
npm run dev
```

Open the HTTPS runtime URL reported by IWSDK and enter XR.

### Emulator controls

Aim the right controller at a tabletop or horizontal surface and press select/trigger.
Press `Space` as a desktop/emulator fallback to plant.
Press `R` to reset.

## Stack

Meta IWSDK · WebXR · TypeScript · Three.js · Vite

import { createSystem } from '@iwsdk/core';
import {
  AmbientLight,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { setCitizenCelebration, setCitizenPanic } from './citizens.js';
import { setVillageXrUi } from './xr-ui.js';
import {
  playFailure,
  playStormStart,
  playStormWarning,
  playSuccess,
} from './audio.js';

type StormPhase =
  | 'idle'
  | 'calm'
  | 'warning'
  | 'storm'
  | 'success'
  | 'failure';

type StormRuntime = {
  village: Group | null;
  stormGroup: Group | null;
  shieldGroup: Group | null;
  shieldRingMaterial: MeshBasicMaterial | null;
  shieldDomeMaterial: MeshBasicMaterial | null;
  lightningMaterial: MeshBasicMaterial | null;
  damageGroup: Group | null;
  ambient: AmbientLight | null;
  sun: DirectionalLight | null;
  phase: StormPhase;
  ready: boolean;
  elapsed: number;
  stormElapsed: number;
  protectedSeconds: number;
  forcedShield: boolean;
  hudBucket: number;
};

const CALM_SECONDS = 10;
const WARNING_SECONDS = 3;
const STORM_SECONDS = 10;
const SUCCESS_RATIO = 0.5;

const runtime: StormRuntime = {
  village: null,
  stormGroup: null,
  shieldGroup: null,
  shieldRingMaterial: null,
  shieldDomeMaterial: null,
  lightningMaterial: null,
  damageGroup: null,
  ambient: null,
  sun: null,
  phase: 'idle',
  ready: false,
  elapsed: 0,
  stormElapsed: 0,
  protectedSeconds: 0,
  forcedShield: false,
  hudBucket: -1,
};

const handWorld = new Vector3();
const handLocal = new Vector3();

function hud(
  title: string,
  sub: string,
  eyebrow = 'DESKBORN — STORM EVENT',
  tone: 'neutral' | 'accent' | 'good' | 'danger' = 'neutral',
): void {
  const node = document.getElementById('deskborn-hud');
  if (!node) return;
  node.innerHTML = `
    <div class="eyebrow">${eyebrow}</div>
    <div class="title">${title}</div>
    <div class="sub">${sub}</div>
  `;
  setVillageXrUi(title, sub, eyebrow, tone);
}

function setLighting(storm: boolean): void {
  if (runtime.ambient) runtime.ambient.intensity = storm ? 0.48 : 1.1;
  if (runtime.sun) runtime.sun.intensity = storm ? 0.72 : 2.1;
}

function createStormVisuals(village: Group): void {
  const storm = new Group();
  storm.visible = false;

  const cloudMaterial = new MeshStandardMaterial({
    color: 0x343a46,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.78,
  });

  for (let i = 0; i < 5; i += 1) {
    const cloud = new Mesh(new SphereGeometry(0.13, 8, 6), cloudMaterial);
    cloud.position.set(
      -0.22 + i * 0.11,
      0.52 + (i % 2) * 0.035,
      -0.08 + (i % 3) * 0.08,
    );
    cloud.scale.set(1.5, 0.55, 1);
    storm.add(cloud);
  }

  const rainMaterial = new MeshBasicMaterial({
    color: 0x9fd8ff,
    transparent: true,
    opacity: 0.72,
  });

  for (let i = 0; i < 16; i += 1) {
    const streak = new Mesh(
      new CylinderGeometry(0.002, 0.002, 0.075, 5),
      rainMaterial,
    );
    const x = (((i * 37) % 100) / 100 - 0.5) * 0.72;
    const z = (((i * 61 + 13) % 100) / 100 - 0.5) * 0.72;
    const y = 0.12 + (((i * 29 + 7) % 100) / 100) * 0.52;
    streak.position.set(x, y, z);
    streak.rotation.z = 0.22;
    streak.userData.deskbornRain = true;
    streak.userData.speed = 0.52 + (i % 5) * 0.07;
    storm.add(streak);
  }

  const lightningMaterial = new MeshBasicMaterial({
    color: 0xe9f7ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lightning = new Mesh(
    new CylinderGeometry(0.004, 0.009, 0.48, 5),
    lightningMaterial,
  );
  lightning.position.set(0.16, 0.29, -0.08);
  lightning.rotation.z = -0.12;
  storm.add(lightning);

  const shield = new Group();
  shield.visible = false;

  const ringMaterial = new MeshBasicMaterial({
    color: 0x8fffd0,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: DoubleSide,
  });
  const ring = new Mesh(new RingGeometry(0.17, 0.205, 42), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  shield.add(ring);

  const domeMaterial = new MeshBasicMaterial({
    color: 0x79e9ff,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    side: DoubleSide,
  });
  const dome = new Mesh(
    new SphereGeometry(0.205, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMaterial,
  );
  dome.scale.y = 0.72;
  dome.position.y = 0.015;
  shield.add(dome);

  const sparkMaterial = new MeshBasicMaterial({
    color: 0xc9ff8f,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  for (let i = 0; i < 9; i += 1) {
    const spark = new Mesh(new SphereGeometry(0.007, 6, 4), sparkMaterial);
    const angle = (i / 9) * Math.PI * 2;
    spark.position.set(Math.cos(angle) * 0.205, 0.04, Math.sin(angle) * 0.205);
    spark.userData.deskbornShieldSpark = true;
    spark.userData.baseAngle = angle;
    shield.add(spark);
  }

  const damage = new Group();
  damage.visible = false;
  const scorchMaterial = new MeshBasicMaterial({
    color: 0x2e221f,
    transparent: true,
    opacity: 0.78,
  });
  for (let i = 0; i < 5; i += 1) {
    const mark = new Mesh(
      new CylinderGeometry(0.035, 0.045, 0.006, 12),
      scorchMaterial,
    );
    const angle = i * 2.1;
    const radius = 0.11 + (i % 2) * 0.1;
    mark.position.set(
      Math.cos(angle) * radius,
      0.054,
      Math.sin(angle) * radius,
    );
    damage.add(mark);
  }

  village.add(storm, shield, damage);
  runtime.stormGroup = storm;
  runtime.shieldGroup = shield;
  runtime.shieldRingMaterial = ringMaterial;
  runtime.shieldDomeMaterial = domeMaterial;
  runtime.lightningMaterial = lightningMaterial;
  runtime.damageGroup = damage;
}

export function configureStorm(
  village: Group,
  ambient: AmbientLight,
  sun: DirectionalLight,
): void {
  runtime.village = village;
  runtime.ambient = ambient;
  runtime.sun = sun;
  createStormVisuals(village);
}

export function setStormReady(active: boolean): void {
  if (!active) {
    resetStorm();
    return;
  }
  if (runtime.ready) return;
  runtime.ready = true;
  runtime.phase = 'calm';
  runtime.elapsed = 0;
  runtime.stormElapsed = 0;
  runtime.protectedSeconds = 0;
  runtime.hudBucket = -1;
}

export function setTestShield(active: boolean): void {
  runtime.forcedShield = active;
}

export function resetStorm(): void {
  runtime.ready = false;
  runtime.phase = 'idle';
  runtime.elapsed = 0;
  runtime.stormElapsed = 0;
  runtime.protectedSeconds = 0;
  runtime.forcedShield = false;
  runtime.hudBucket = -1;
  if (runtime.stormGroup) runtime.stormGroup.visible = false;
  if (runtime.shieldGroup) runtime.shieldGroup.visible = false;
  if (runtime.damageGroup) runtime.damageGroup.visible = false;
  setCitizenCelebration(false);
  setCitizenPanic(false);
  setLighting(false);
}

function beginWarning(): void {
  runtime.phase = 'warning';
  playStormWarning();
  setCitizenCelebration(false);
  setCitizenPanic(true);
  hud(
    'Storm incoming',
    'The citizens are panicking. Get your open palm ready above the village.',
    'DESKBORN — STORM WARNING',
    'danger',
  );
}

function beginStorm(): void {
  runtime.phase = 'storm';
  playStormStart();
  setCitizenCelebration(false);
  runtime.stormElapsed = 0;
  runtime.protectedSeconds = 0;
  runtime.hudBucket = -1;
  if (runtime.stormGroup) runtime.stormGroup.visible = true;
  setLighting(true);
  hud(
    'Protect the village',
    'Hold an OPEN hand above the settlement. Keep the glowing shield over its center.',
    'DESKBORN — STORM EVENT',
    'danger',
  );
}

function finishStorm(): void {
  const ratio = runtime.protectedSeconds / STORM_SECONDS;
  const success = ratio >= SUCCESS_RATIO;
  runtime.phase = success ? 'success' : 'failure';
  if (runtime.stormGroup) runtime.stormGroup.visible = false;
  if (runtime.shieldGroup) runtime.shieldGroup.visible = false;
  if (runtime.damageGroup) runtime.damageGroup.visible = !success;
  setLighting(false);
  setCitizenPanic(false);
  setCitizenCelebration(success);

  if (success) {
    playSuccess();
    hud(
      'The village survived',
      `Shield coverage ${Math.round(ratio * 100)}%. Your hand became part of the world.`,
      'DESKBORN — VILLAGE SAVED',
      'good',
    );
  } else {
    playFailure();
    hud(
      'The storm broke through',
      `Shield coverage ${Math.round(ratio * 100)}%. Reset and keep your open palm centered longer.`,
      'DESKBORN — VILLAGE DAMAGED',
      'danger',
    );
  }
}

function animateStorm(delta: number): void {
  const storm = runtime.stormGroup;
  if (!storm) return;
  for (const child of storm.children) {
    if (!child.userData.deskbornRain) continue;
    child.position.y -= (child.userData.speed as number) * delta;
    child.position.x += 0.1 * delta;
    if (child.position.y < 0.04) {
      child.position.y = 0.62;
      child.position.x -= 0.15;
    }
  }

  if (runtime.lightningMaterial) {
    const flashSignal =
      Math.sin(runtime.stormElapsed * 8.3) +
      Math.sin(runtime.stormElapsed * 17.7);
    runtime.lightningMaterial.opacity = flashSignal > 1.45 ? 0.92 : 0;
    if (runtime.ambient && runtime.sun) {
      const flash = runtime.lightningMaterial.opacity > 0;
      runtime.ambient.intensity = flash ? 0.78 : 0.48;
      runtime.sun.intensity = flash ? 1.18 : 0.72;
    }
  }
}

function updateShield(
  delta: number,
  handConnected: boolean,
  grip: Group | undefined,
  pinchStrength: number,
): boolean {
  const village = runtime.village;
  const shield = runtime.shieldGroup;
  if (!village || !shield) return false;

  let active = false;
  let centered = false;
  let x = 0;
  let z = 0;

  const openHand = handConnected && !!grip && pinchStrength < 0.22;

  if (openHand && grip) {
    grip.updateWorldMatrix(true, false);
    village.updateWorldMatrix(true, false);
    grip.getWorldPosition(handWorld);
    handLocal.copy(handWorld);
    village.worldToLocal(handLocal);

    const horizontalDistance = Math.hypot(handLocal.x, handLocal.z);
    const usefulHeight = handLocal.y > 0.07 && handLocal.y < 0.55;
    active = usefulHeight && horizontalDistance < 0.38;
    centered = active && horizontalDistance < 0.24;
    x = handLocal.x;
    z = handLocal.z;
  } else if (runtime.forcedShield) {
    active = true;
    centered = true;
    x = 0;
    z = 0;
  }

  shield.visible = active;
  if (active) {
    shield.position.set(x, 0.055, z);
    const pulse = 1 + Math.sin(runtime.stormElapsed * 7) * (centered ? 0.055 : 0.025);
    shield.scale.setScalar(pulse);
    shield.rotation.y += delta * (centered ? 1.6 : 0.65);

    for (const child of shield.children) {
      if (!child.userData.deskbornShieldSpark) continue;
      const baseAngle = child.userData.baseAngle as number;
      const angle = baseAngle + runtime.stormElapsed * (centered ? 2.4 : 1.2);
      const radius = centered ? 0.21 : 0.19;
      child.position.set(
        Math.cos(angle) * radius,
        0.045 + Math.sin(runtime.stormElapsed * 6 + baseAngle) * 0.018,
        Math.sin(angle) * radius,
      );
      child.scale.setScalar(centered ? 1.35 : 0.72);
    }

    if (runtime.shieldRingMaterial) {
      runtime.shieldRingMaterial.opacity = centered ? 0.95 : 0.45;
    }
    if (runtime.shieldDomeMaterial) {
      runtime.shieldDomeMaterial.opacity = centered ? 0.22 : 0.08;
    }
  }

  if (centered) runtime.protectedSeconds += delta;
  return centered;
}

const StormSystemBase = createSystem({});

export class StormSystem extends StormSystemBase {
  update(delta: number): void {
    if (!runtime.ready || !runtime.village?.visible) return;

    runtime.elapsed += delta;

    if (runtime.phase === 'calm' && runtime.elapsed >= CALM_SECONDS) {
      beginWarning();
    }

    if (
      runtime.phase === 'warning' &&
      runtime.elapsed >= CALM_SECONDS + WARNING_SECONDS
    ) {
      beginStorm();
    }

    if (runtime.phase !== 'storm') return;

    runtime.stormElapsed += delta;
    animateStorm(delta);

    const hand = this.input.xr.visualAdapters.hand.right;
    const protectedNow = updateShield(
      delta,
      hand.connected,
      hand.gripSpace,
      hand.getPinchStrength(),
    );

    const bucket = Math.floor(runtime.stormElapsed * 2);
    if (bucket !== runtime.hudBucket) {
      runtime.hudBucket = bucket;
      const score = Math.round(
        (runtime.protectedSeconds / STORM_SECONDS) * 100,
      );
      hud(
        protectedNow ? 'Shield holding' : 'Open your palm over the village',
        `Protection ${Math.min(100, score)}% · ${Math.max(
          0,
          Math.ceil(STORM_SECONDS - runtime.stormElapsed),
        )}s remaining`,
        'DESKBORN — PROTECT',
        protectedNow ? 'good' : 'danger',
      );
    }

    if (runtime.stormElapsed >= STORM_SECONDS) finishStorm();
  }
}

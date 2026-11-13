import {
  DistanceGrabbable,
  Entity,
  Grabbed,
  Hovered,
  MovementMode,
  RayInteractable,
  World,
  createSystem,
} from '@iwsdk/core';
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { setVillageXrUi } from './xr-ui.js';
import { playGrab } from './audio.js';

type CitizenRuntime = {
  seed: number;
  step: number;
  targetX: number;
  targetZ: number;
  speed: number;
  wasGrabbed: boolean;
  elapsed: number;
  panicSeen: boolean;
  materials: MeshStandardMaterial[];
};

let citizensActive = false;
let panicMode = false;
let lastHint = '';
const direction = new Vector3();
const desiredScale = new Vector3();

function standardMaterial(color: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.02,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
}

function nextTarget(runtime: CitizenRuntime): void {
  runtime.step += 1;
  const angle = runtime.seed * 1.618 + runtime.step * 2.399;
  const radiusNoise = ((runtime.seed * 41 + runtime.step * 17) % 100) / 100;
  const radius = panicMode
    ? 0.035 + radiusNoise * 0.09
    : 0.08 + radiusNoise * 0.18;
  runtime.targetX = Math.cos(angle) * radius;
  runtime.targetZ = Math.sin(angle) * radius;
}

function citizenModel(
  x: number,
  z: number,
  color: number,
  seed: number,
): Group {
  const group = new Group();

  const bodyMaterial = standardMaterial(color);
  const headMaterial = standardMaterial(0xe6b98d);

  const body = new Mesh(
    new CylinderGeometry(0.012, 0.016, 0.045, 8),
    bodyMaterial,
  );
  body.position.y = 0.055;
  body.castShadow = false;

  const head = new Mesh(
    new SphereGeometry(0.014, 10, 8),
    headMaterial,
  );
  head.position.y = 0.092;
  head.castShadow = false;

  const hitVolume = new Mesh(
    new SphereGeometry(0.037, 8, 6),
    new MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
    }),
  );
  hitVolume.position.y = 0.06;

  group.add(body, head, hitVolume);
  group.position.set(x, 0, z);

  const runtime: CitizenRuntime = {
    seed,
    step: 0,
    targetX: x,
    targetZ: z,
    speed: 0.035 + (seed % 4) * 0.005,
    wasGrabbed: false,
    elapsed: seed * 0.31,
    panicSeen: false,
    materials: [bodyMaterial, headMaterial],
  };
  nextTarget(runtime);

  group.userData.deskbornCitizen = runtime;
  return group;
}

export function setCitizensActive(active: boolean): void {
  citizensActive = active;
  if (!active) lastHint = '';
}

export function setCitizenPanic(active: boolean): void {
  panicMode = active;
  if (active) lastHint = '';
}

export function createCitizens(world: World, parent: Entity): void {
  const specs: Array<[number, number, number, number]> = [
    [-0.04, -0.03, 0x5079a8, 1],
    [0.05, 0.09, 0xc97155, 2],
    [0.14, 0.01, 0x6c5b87, 3],
    [-0.13, 0.12, 0x4f7a62, 4],
    [0.02, -0.17, 0xc39a45, 5],
    [-0.20, -0.15, 0x765d9e, 6],
    [0.22, 0.14, 0x3f7f87, 7],
    [-0.02, 0.19, 0xa65d62, 8],
  ];

  for (const [x, z, color, seed] of specs) {
    const model = citizenModel(x, z, color, seed);
    const entity = world.createTransformEntity(model, parent);
    entity.addComponent(RayInteractable);
    entity.addComponent(DistanceGrabbable, {
      movementMode: MovementMode.MoveAtSource,
      rotate: false,
      scale: false,
      translate: true,
      returnToOrigin: false,
      detachOnGrab: false,
    });
  }
}

function setHint(title: string, sub: string): void {
  const key = title + '|' + sub;
  if (key === lastHint) return;
  lastHint = key;

  const hud = document.getElementById('deskborn-hud');
  if (!hud) return;
  hud.innerHTML = `
    <div class="eyebrow">DESKBORN — LIVING VILLAGE</div>
    <div class="title">${title}</div>
    <div class="sub">${sub}</div>
  `;

  const tone =
    title === 'You are holding a citizen'
      ? 'good'
      : title === 'Citizen targeted'
        ? 'accent'
        : 'neutral';
  setVillageXrUi(title, sub, 'DESKBORN — LIVING VILLAGE', tone);
}

const CitizenSystemBase = createSystem({
  citizens: { required: [DistanceGrabbable, RayInteractable] },
});

export class CitizenSystem extends CitizenSystemBase {
  update(delta: number): void {
    if (!citizensActive) return;

    const pinchStrength = Math.max(
      this.input.xr.visualAdapters.hand.left.getPinchStrength(),
      this.input.xr.visualAdapters.hand.right.getPinchStrength(),
    );

    let anyHovered = false;
    let anyGrabbed = false;

    for (const entity of this.queries.citizens.entities) {
      const object = entity.object3D;
      const runtime = object?.userData.deskbornCitizen as
        | CitizenRuntime
        | undefined;
      if (!object || !runtime) continue;

      runtime.elapsed += delta;

      if (runtime.panicSeen !== panicMode) {
        runtime.panicSeen = panicMode;
        nextTarget(runtime);
      }

      const grabbed = entity.hasComponent(Grabbed);
      const hovered = entity.hasComponent(Hovered);
      anyGrabbed ||= grabbed;
      anyHovered ||= hovered;

      const targetScale = grabbed ? 1.28 : hovered ? 1.16 : 1;
      desiredScale.setScalar(targetScale);
      object.scale.lerp(desiredScale, Math.min(1, delta * 12));

      const glow = grabbed
        ? 1.1
        : hovered
          ? 0.28 + 0.72 * pinchStrength
          : panicMode
            ? 0.12
            : 0;
      for (const material of runtime.materials) {
        material.emissive.setHex(
          glow > 0 ? (panicMode ? 0x6d2b18 : 0x36511f) : 0x000000,
        );
        material.emissiveIntensity +=
          (glow - material.emissiveIntensity) * Math.min(1, delta * 12);
      }

      if (grabbed) {
        if (!runtime.wasGrabbed) playGrab();
        runtime.wasGrabbed = true;
        continue;
      }

      if (runtime.wasGrabbed) {
        runtime.wasGrabbed = false;
        const radius = Math.hypot(object.position.x, object.position.z);
        if (radius > 0.30) {
          const scale = 0.30 / radius;
          object.position.x *= scale;
          object.position.z *= scale;
        }
        object.position.y = 0;
        nextTarget(runtime);
      }

      if (hovered && !panicMode) continue;

      direction.set(
        runtime.targetX - object.position.x,
        0,
        runtime.targetZ - object.position.z,
      );
      const remaining = direction.length();

      if (remaining < 0.018) {
        nextTarget(runtime);
      } else {
        direction.normalize();
        const speed = runtime.speed * (panicMode ? 2.45 : 1);
        object.position.addScaledVector(direction, speed * delta);
        object.position.y = 0;
        object.rotation.y = Math.atan2(direction.x, direction.z);
      }

      const sway = panicMode ? 0.065 : 0.025;
      const frequency = panicMode ? 12 : 7;
      object.rotation.z =
        Math.sin(runtime.elapsed * frequency + runtime.seed) * sway;
    }

    if (panicMode) return;

    if (anyGrabbed) {
      setHint(
        'You are holding a citizen',
        'Move your pinching hand, then release to place them back into the village.',
      );
    } else if (anyHovered) {
      setHint(
        'Citizen targeted',
        'Pinch and hold to pick them up. The glow rises as your pinch closes.',
      );
    } else {
      setHint(
        'The village is alive',
        'Aim your hand ray at a citizen and pinch. No controller-specific action is required.',
      );
    }
  }
}

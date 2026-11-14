import {
  EnvironmentRaycastTarget,
  RaycastSpace,
  World,
  createSystem,
} from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { CitizenSystem, createCitizens, setCitizensActive } from './citizens.js';
import {
  StormSystem,
  configureStorm,
  resetStorm,
  setStormReady,
  setTestShield,
} from './storm.js';
import {
  configureXrUi,
  hidePlacementXrUi,
  hideVillageXrUi,
  setPlacementXrUi,
  setVillageXrUi,
} from './xr-ui.js';
import { playPlant, unlockAudio } from './audio.js';
import {
  AmbientLight,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

type DeskbornState = {
  previewGroup: Group | null;
  previewRing: Mesh | null;
  previewSeed: Mesh | null;
  reticleMaterial: MeshStandardMaterial | null;
  seedMaterial: MeshStandardMaterial | null;
  village: Group | null;
  planted: boolean;
  growth: number;
  pulse: number;
  requestPlant: boolean;
  lastHudMode: string;
  noSurfaceElapsed: number;
  fallbackAvailable: boolean;
  fallbackUsed: boolean;
};

const state: DeskbornState = {
  previewGroup: null,
  previewRing: null,
  previewSeed: null,
  reticleMaterial: null,
  seedMaterial: null,
  village: null,
  planted: false,
  growth: 0,
  pulse: 0,
  requestPlant: false,
  lastHudMode: '',
  noSurfaceElapsed: 0,
  fallbackAvailable: false,
  fallbackUsed: false,
};

const WORLD_UP = new Vector3(0, 1, 0);
const surfaceUp = new Vector3();
const viewerWorld = new Vector3();
const fallbackTarget = new Vector3();
const fallbackForward = new Vector3();
const FALLBACK_SECONDS = 8;

function mat(color: number, roughness = 0.72): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

function house(x: number, z: number, scale = 1): Group {
  const g = new Group();
  const body = new Mesh(
    new BoxGeometry(0.115 * scale, 0.085 * scale, 0.095 * scale),
    mat(0xd8c59d),
  );
  body.position.y = 0.064 * scale;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new Mesh(
    new ConeGeometry(0.085 * scale, 0.065 * scale, 4),
    mat(0x7c3f34),
  );
  roof.position.y = 0.139 * scale;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  g.position.set(x, 0, z);
  return g;
}

function tree(x: number, z: number, scale = 1): Group {
  const g = new Group();
  const trunk = new Mesh(
    new CylinderGeometry(0.011 * scale, 0.016 * scale, 0.075 * scale, 7),
    mat(0x6f4b32),
  );
  trunk.position.y = 0.061 * scale;
  g.add(trunk);

  const crown = new Mesh(
    new ConeGeometry(0.052 * scale, 0.125 * scale, 8),
    mat(0x436b45),
  );
  crown.position.y = 0.158 * scale;
  crown.castShadow = true;
  g.add(crown);
  g.position.set(x, 0, z);
  return g;
}

function citizen(x: number, z: number, color: number): Group {
  const g = new Group();
  const body = new Mesh(
    new CylinderGeometry(0.011, 0.015, 0.042, 8),
    mat(color, 0.8),
  );
  body.position.y = 0.053;

  const head = new Mesh(
    new SphereGeometry(0.013, 10, 8),
    mat(0xe6b98d, 0.9),
  );
  head.position.y = 0.087;
  g.add(body, head);
  g.position.set(x, 0, z);
  return g;
}

function buildVillage(): Group {
  const village = new Group();

  const island = new Mesh(
    new CylinderGeometry(0.39, 0.43, 0.042, 28),
    mat(0x6f8050),
  );
  island.position.y = 0.021;
  island.receiveShadow = true;
  village.add(island);

  const soil = new Mesh(
    new CylinderGeometry(0.18, 0.19, 0.014, 24),
    mat(0x8b6a48),
  );
  soil.position.set(0.045, 0.049, 0.025);
  village.add(soil);

  const pathMaterial = mat(0xcdbb94, 0.92);
  const pathPoints: Array<[number, number, number]> = [
    [-0.12, 0.055, -0.02],
    [-0.055, 0.055, 0.0],
    [0.01, 0.055, 0.015],
    [0.075, 0.055, 0.035],
    [0.135, 0.055, 0.065],
  ];
  for (const [x, y, z] of pathPoints) {
    const stone = new Mesh(new BoxGeometry(0.055, 0.008, 0.034), pathMaterial);
    stone.position.set(x, y, z);
    stone.rotation.y = (x + z) * 2.2;
    village.add(stone);
  }

  const well = new Group();
  const wellBase = new Mesh(
    new CylinderGeometry(0.042, 0.048, 0.042, 12),
    mat(0x8e8676, 0.9),
  );
  wellBase.position.y = 0.071;
  const wellHole = new Mesh(
    new CylinderGeometry(0.028, 0.028, 0.045, 12),
    new MeshStandardMaterial({
      color: 0x172126,
      roughness: 0.45,
      metalness: 0.08,
    }),
  );
  wellHole.position.y = 0.094;
  well.add(wellBase, wellHole);
  well.position.set(0.0, 0, 0.105);
  village.add(well);

  const crystalMaterial = new MeshStandardMaterial({
    color: 0xb9ff7a,
    emissive: 0x4d8c2a,
    emissiveIntensity: 1.5,
    roughness: 0.28,
    metalness: 0.05,
  });
  for (const [x, z] of [
    [-0.31, -0.02],
    [0.30, 0.15],
    [-0.08, -0.29],
  ] as Array<[number, number]>) {
    const crystal = new Mesh(
      new ConeGeometry(0.012, 0.055, 5),
      crystalMaterial,
    );
    crystal.position.set(x, 0.075, z);
    crystal.rotation.y = x * 9;
    village.add(crystal);
  }

  village.add(
    house(-0.16, -0.08, 1),
    house(0.105, -0.145, 0.86),
    house(0.17, 0.105, 0.72),
    tree(-0.255, 0.115, 1),
    tree(-0.045, 0.205, 0.9),
    tree(0.275, -0.02, 0.76),

  );

  village.scale.setScalar(0.001);
  village.visible = false;
  return village;
}

function setHud(mode: 'scan' | 'invalid' | 'ready' | 'planted'): void {
  if (state.lastHudMode === mode) return;
  state.lastHudMode = mode;

  const hud = document.getElementById('deskborn-hud');
  if (!hud) return;

  const content = {
    scan: {
      eyebrow: 'DESKBORN — SEED / BUILD 0.10',
      title: 'Aim at a surface',
      sub: 'Look at a tabletop or other horizontal surface, then pinch with either hand.',
    },
    invalid: {
      eyebrow: 'DESKBORN — SEED / BUILD 0.10',
      title: 'Find a flatter surface',
      sub: 'The village can only be planted on a reasonably horizontal surface.',
    },
    ready: {
      eyebrow: 'DESKBORN — SEED / BUILD 0.10',
      title: 'Pinch / trigger to plant',
      sub: 'The green ring marks where the miniature world will grow.',
    },
    planted: {
      eyebrow: 'DESKBORN — SEED',
      title: 'A tiny world took root.',
      sub: 'Press R to reset during desktop testing.',
    },
  }[mode];

  hud.innerHTML = `
    <div class="eyebrow">${content.eyebrow}</div>
    <div class="title">${content.title}</div>
    <div class="sub">${content.sub}</div>
  `;

  if (mode === 'scan') {
    setPlacementXrUi(content.title, content.sub, content.eyebrow, 'neutral');
  } else if (mode === 'invalid') {
    setPlacementXrUi(content.title, content.sub, content.eyebrow, 'danger');
  } else if (mode === 'ready') {
    setPlacementXrUi(content.title, content.sub, content.eyebrow, 'accent');
  } else {
    hidePlacementXrUi();
    setVillageXrUi(
      'A tiny world took root',
      'Aim at a citizen and pinch / hold to pick them up.',
      'DESKBORN — LIVING VILLAGE',
      'accent',
    );
  }
}

function addXrLauncher(world: World): void {
  const wrapper = document.createElement('div');
  wrapper.id = 'deskborn-xr-launcher';
  wrapper.innerHTML = `
    <button id="deskborn-enter-xr" type="button">ENTER XR</button>
    <div id="deskborn-xr-status">Meta Quest / WebXR-compatible browser required.</div>
  `;
  document.body.appendChild(wrapper);

  const style = document.createElement('style');
  style.textContent = `
    #deskborn-xr-launcher {
      position: fixed;
      left: 22px;
      bottom: 22px;
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
      font-family: system-ui, sans-serif;
    }
    #deskborn-enter-xr {
      appearance: none;
      border: 1px solid rgba(185,255,122,.55);
      border-radius: 14px;
      padding: 13px 18px;
      background: rgba(12,14,12,.9);
      color: #d9ffb4;
      font: 800 14px/1 system-ui, sans-serif;
      letter-spacing: .08em;
      cursor: pointer;
      box-shadow: 0 14px 36px rgba(0,0,0,.28);
    }
    #deskborn-enter-xr:hover {
      background: rgba(31,43,25,.96);
    }
    #deskborn-enter-xr:disabled {
      opacity: .55;
      cursor: default;
    }
    #deskborn-xr-status {
      max-width: 360px;
      color: rgba(244,240,232,.62);
      font: 500 11px/1.35 system-ui, sans-serif;
    }
  `;
  document.head.appendChild(style);

  const button = document.getElementById('deskborn-enter-xr');
  const status = document.getElementById('deskborn-xr-status');
  if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLDivElement)) {
    return;
  }

  const checkSupport = async (): Promise<boolean> => {
    const xr = navigator.xr;
    if (!xr) {
      button.disabled = true;
      button.textContent = 'XR NOT AVAILABLE';
      status.textContent =
        'Desktop browser detected without WebXR. Use npm run dev for the IWSDK emulator, or open this URL in Meta Quest Browser.';
      return false;
    }

    try {
      const supported = await xr.isSessionSupported('immersive-ar');
      if (!supported) {
        button.disabled = true;
        button.textContent = 'XR NOT AVAILABLE';
        status.textContent =
          'Immersive AR is not supported on this device/browser. Use the local IWSDK emulator on desktop or Meta Quest Browser for the public build.';
        return false;
      }

      button.disabled = false;
      button.textContent = 'ENTER XR';
      status.textContent = 'Immersive AR supported. Ready to enter XR.';
      return true;
    } catch (error: unknown) {
      button.disabled = true;
      button.textContent = 'XR CHECK FAILED';
      const message = error instanceof Error ? error.message : String(error);
      status.textContent = 'Could not verify WebXR support: ' + message;
      return false;
    }
  };

  void checkSupport();

  button.addEventListener('click', async () => {
    if (!(await checkSupport())) return;

    unlockAudio();
    button.disabled = true;
    status.textContent = 'Requesting immersive AR…';

    try {
      await world.launchXR();
      status.textContent = 'XR session active.';
    } catch (error: unknown) {
      button.disabled = false;
      const message = error instanceof Error ? error.message : String(error);
      status.textContent =
        'XR could not start. Open this HTTPS page in Meta Quest Browser. ' +
        message;
    }
  });
}

function addHud(): void {
  const hud = document.createElement('div');
  hud.id = 'deskborn-hud';
  document.body.appendChild(hud);

  const style = document.createElement('style');
  style.textContent = `
    #deskborn-hud {
      position: fixed;
      left: 22px;
      top: 22px;
      z-index: 20;
      max-width: 420px;
      padding: 14px 16px;
      border-radius: 14px;
      color: #f4f0e8;
      background: rgba(12, 14, 12, .78);
      border: 1px solid rgba(255,255,255,.16);
      backdrop-filter: blur(14px);
      box-shadow: 0 18px 50px rgba(0,0,0,.25);
      font: 500 14px/1.35 system-ui, sans-serif;
      pointer-events: none;
    }
    #deskborn-hud .eyebrow { opacity: .55; font-size: 10px; letter-spacing: .15em; }
    #deskborn-hud .title { margin-top: 5px; font-size: 17px; font-weight: 760; }
    #deskborn-hud .sub { margin-top: 3px; opacity: .64; font-size: 12px; }
  `;
  document.head.appendChild(style);
  setHud('scan');
}

function setPreviewChildrenVisible(visible: boolean): void {
  if (state.previewRing) state.previewRing.visible = visible;
  if (state.previewSeed) state.previewSeed.visible = visible;
}

function resetPlacement(): void {
  state.planted = false;
  state.growth = 0;
  state.requestPlant = false;
  state.noSurfaceElapsed = 0;
  state.fallbackAvailable = false;
  state.fallbackUsed = false;
  setCitizensActive(false);
  resetStorm();
  hideVillageXrUi();
  setPreviewChildrenVisible(true);

  if (state.village) {
    state.village.visible = false;
    state.village.scale.setScalar(0.001);
  }
  setHud('scan');
}

const DeskbornPlacementSystemBase = createSystem({
  raycastTargets: { required: [EnvironmentRaycastTarget] },
});

class DeskbornPlacementSystem extends DeskbornPlacementSystemBase {
  private plantFallback(): void {
    const village = state.village;
    if (!village || state.planted) return;

    this.camera.updateWorldMatrix(true, false);
    this.camera.getWorldPosition(viewerWorld);
    this.camera.getWorldDirection(fallbackForward);
    fallbackForward.y = 0;

    if (fallbackForward.lengthSq() < 0.0001) {
      fallbackForward.set(0, 0, -1);
    } else {
      fallbackForward.normalize();
    }

    fallbackTarget.copy(viewerWorld).addScaledVector(fallbackForward, 0.9);
    fallbackTarget.y = Math.max(0.62, viewerWorld.y - 0.75);

    if (village.parent) {
      village.parent.updateWorldMatrix(true, false);
      village.parent.worldToLocal(fallbackTarget);
    }

    village.position.copy(fallbackTarget);
    village.quaternion.identity();
    village.scale.setScalar(0.001);
    village.visible = true;

    state.planted = true;
    state.fallbackUsed = true;
    state.growth = 0;
    playPlant();
    setPreviewChildrenVisible(false);
    hidePlacementXrUi();
    setVillageXrUi(
      'Surface fallback activated',
      'No flat surface was found, so your village was placed safely in front of you.',
      'DESKBORN — READY',
      'accent',
    );

    const hud = document.getElementById('deskborn-hud');
    if (hud) {
      hud.innerHTML = `
        <div class="eyebrow">DESKBORN — SURFACE FALLBACK</div>
        <div class="title">Village placed in front of you</div>
        <div class="sub">You chose the safe front placement. Continue normally.</div>
      `;
    }
  }

  update(delta: number): void {
    state.pulse += delta;

    if (state.previewSeed && !state.planted) {
      const pulse = 1 + Math.sin(state.pulse * 4.4) * 0.09;
      state.previewSeed.scale.setScalar(pulse);
      state.previewSeed.rotation.y += delta * 0.9;
    }

    if (state.planted && state.village && state.growth < 1) {
      state.growth = Math.min(1, state.growth + delta / 1.45);
      const t = 1 - Math.pow(1 - state.growth, 3);
      state.village.scale.setScalar(Math.max(0.001, t));
      state.village.rotation.y = (1 - t) * -0.16;
      if (state.growth >= 1) {
        setCitizensActive(true);
        setStormReady(true);
      }
    }

    if (state.planted) return;

    let hasHit = false;
    let hasValidHorizontalHit = false;

    this.queries.raycastTargets.entities.forEach((entity) => {
      const object = entity.object3D;
      const xrHitTestResult = entity.getValue(
        EnvironmentRaycastTarget,
        'xrHitTestResult',
      ) as XRHitTestResult | undefined;

      if (!object || !xrHitTestResult || !object.visible) return;

      hasHit = true;
      surfaceUp.set(0, 1, 0).applyQuaternion(object.quaternion).normalize();
      const valid = surfaceUp.dot(WORLD_UP) > 0.72;
      hasValidHorizontalHit ||= valid;

      state.reticleMaterial?.color.setHex(valid ? 0x9dff78 : 0xff786f);
      state.reticleMaterial?.emissive.setHex(valid ? 0x3e7c23 : 0x7d231f);
      state.seedMaterial?.color.setHex(valid ? 0xd7ff70 : 0xffa06e);
      state.seedMaterial?.emissive.setHex(valid ? 0x72a621 : 0x8a351e);
    });

    const immersive =
      this.visibilityState.peek() === 'visible' ||
      this.visibilityState.peek() === 'visible-blurred';

    if (immersive && !hasValidHorizontalHit && !state.fallbackAvailable) {
      state.noSurfaceElapsed += delta;
      if (state.noSurfaceElapsed >= FALLBACK_SECONDS) {
        state.fallbackAvailable = true;
      }
    }

    if (state.fallbackAvailable && !hasValidHorizontalHit) {
      const hud = document.getElementById('deskborn-hud');
      if (hud) {
        hud.innerHTML = `
          <div class="eyebrow">DESKBORN — OPTIONAL FALLBACK</div>
          <div class="title">Still looking for a surface?</div>
          <div class="sub">Keep looking as long as you want, or pinch with either hand now to place the village in front of you.</div>
        `;
      }
      setPlacementXrUi(
        'Place in front of me',
        'Keep looking for a tabletop, or pinch with either hand now to use the safe front placement.',
        'DESKBORN — OPTIONAL FALLBACK',
        'accent',
      );
    } else {
      setHud(!hasHit ? 'scan' : !hasValidHorizontalHit ? 'invalid' : 'ready');
    }

    const rightSelect = this.input.gamepads.right?.getSelectStart() ?? false;
    const leftSelect = this.input.gamepads.left?.getSelectStart() ?? false;
    const requestedPlant = rightSelect || leftSelect || state.requestPlant;
    state.requestPlant = false;

    if (!requestedPlant) return;

    if (state.fallbackAvailable && !hasValidHorizontalHit) {
      this.plantFallback();
      return;
    }

    this.queries.raycastTargets.entities.forEach((entity) => {
      if (state.planted) return;

      const object = entity.object3D;
      const xrHitTestResult = entity.getValue(
        EnvironmentRaycastTarget,
        'xrHitTestResult',
      ) as XRHitTestResult | undefined;

      if (!object || !xrHitTestResult || !object.visible || !state.village) return;

      surfaceUp.set(0, 1, 0).applyQuaternion(object.quaternion).normalize();
      if (surfaceUp.dot(WORLD_UP) <= 0.72) return;

      const placementOffset = surfaceUp.clone().multiplyScalar(0.012);
      state.village.position.copy(object.position).add(placementOffset);
      state.village.quaternion.copy(object.quaternion);
      state.village.scale.setScalar(0.001);
      state.village.visible = true;
      state.planted = true;
      state.growth = 0;
      playPlant();
      setPreviewChildrenVisible(false);
      setHud('planted');
    });
  }
}

const sceneContainer = document.getElementById('scene-container');
if (!(sceneContainer instanceof HTMLDivElement)) {
  throw new Error('Missing #scene-container');
}

World.create(sceneContainer, projectOptions).then((world) => {
  const root = world.getActiveRoot();

  const ambient = new AmbientLight(0xffffff, 1.1);
  const sun = new DirectionalLight(0xfff1d2, 2.1);
  sun.position.set(1.3, 2.2, 0.7);
  sun.castShadow = true;
  root.add(ambient, sun);

  const reticleMaterial = new MeshStandardMaterial({
    color: 0x9dff78,
    emissive: 0x3e7c23,
    emissiveIntensity: 1.6,
    roughness: 0.42,
    metalness: 0.06,
    transparent: true,
    opacity: 0.92,
  });

  const seedMaterial = new MeshStandardMaterial({
    color: 0xd7ff70,
    emissive: 0x72a621,
    emissiveIntensity: 2.4,
    roughness: 0.28,
    metalness: 0.05,
  });

  const previewGroup = new Group();
  const ring = new Mesh(new RingGeometry(0.075, 0.095, 36), reticleMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.003;
  previewGroup.add(ring);

  const previewSeed = new Mesh(
    new SphereGeometry(0.036, 18, 12),
    seedMaterial,
  );
  previewSeed.position.y = 0.05;
  previewSeed.castShadow = true;
  previewGroup.add(previewSeed);

  const previewEntity = world.createTransformEntity(previewGroup);
  previewEntity.addComponent(EnvironmentRaycastTarget, {
    space: RaycastSpace.Viewer,
    maxDistance: 4,
  });

  const village = buildVillage();
  const villageEntity = world.createTransformEntity(village);
  createCitizens(world, villageEntity);
  configureStorm(village, ambient, sun);
  configureXrUi(previewGroup, village);

  state.previewGroup = previewGroup;
  state.previewRing = ring;
  state.previewSeed = previewSeed;
  state.reticleMaterial = reticleMaterial;
  state.seedMaterial = seedMaterial;
  state.village = village;

  world.registerSystem(DeskbornPlacementSystem);
  world.registerSystem(CitizenSystem);
  world.registerSystem(StormSystem);
  addHud();
  addXrLauncher(world);

  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      state.requestPlant = true;
      event.preventDefault();
    } else if (event.key.toLowerCase() === 'r') {
      resetPlacement();
    } else if (event.key.toLowerCase() === 'h') {
      setTestShield(true);
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key.toLowerCase() === 'h') {
      setTestShield(false);
    }
  });
});

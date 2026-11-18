import {
  CanvasTexture,
  Group,
  Sprite,
  SpriteMaterial,
} from 'three';

type PanelTone = 'neutral' | 'accent' | 'good' | 'danger';

type PanelHandle = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
  sprite: Sprite;
};

let previewPanel: PanelHandle | null = null;
let villagePanel: PanelHandle | null = null;

const tones: Record<PanelTone, { accent: string; glow: string }> = {
  neutral: { accent: '#EDE7D8', glow: 'rgba(237,231,216,.16)' },
  accent: { accent: '#B9FF7A', glow: 'rgba(185,255,122,.20)' },
  good: { accent: '#89FFD0', glow: 'rgba(137,255,208,.22)' },
  danger: { accent: '#FF967F', glow: 'rgba(255,150,127,.22)' },
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height,
  );
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function createPanel(widthMeters: number, heightMeters: number): PanelHandle {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create XR UI canvas context');
  }

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new Sprite(material);
  sprite.scale.set(widthMeters, heightMeters, 1);
  sprite.renderOrder = 1000;

  return { canvas, context, texture, sprite };
}

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length >= maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function paint(
  panel: PanelHandle,
  eyebrow: string,
  title: string,
  sub: string,
  tone: PanelTone,
): void {
  const { context, canvas, texture } = panel;
  const palette = tones[tone];

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.shadowColor = 'rgba(0,0,0,.42)';
  context.shadowBlur = 32;
  roundedRect(context, 34, 34, 956, 444, 42);
  context.fillStyle = 'rgba(10,13,12,.88)';
  context.fill();
  context.restore();

  roundedRect(context, 34, 34, 956, 444, 42);
  context.strokeStyle = 'rgba(255,255,255,.15)';
  context.lineWidth = 3;
  context.stroke();

  roundedRect(context, 58, 58, 10, 396, 5);
  context.fillStyle = palette.accent;
  context.shadowColor = palette.glow;
  context.shadowBlur = 22;
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = palette.accent;
  context.font = '700 25px system-ui, -apple-system, Segoe UI, sans-serif';
  context.fillText(eyebrow.toUpperCase(), 98, 118);

  context.fillStyle = '#FFF9ED';
  context.font = '800 56px system-ui, -apple-system, Segoe UI, sans-serif';
  const titleLines = wrapLines(context, title, 830, 2);
  titleLines.forEach((line, index) => {
    context.fillText(line, 98, 205 + index * 66);
  });

  context.fillStyle = 'rgba(255,249,237,.72)';
  context.font = '500 31px system-ui, -apple-system, Segoe UI, sans-serif';
  const subStart = titleLines.length > 1 ? 355 : 300;
  const subLines = wrapLines(context, sub, 820, 2);
  subLines.forEach((line, index) => {
    context.fillText(line, 98, subStart + index * 42);
  });

  texture.needsUpdate = true;
}

export function configureXrUi(preview: Group, village: Group): void {
  previewPanel = createPanel(0.54, 0.27);
  previewPanel.sprite.position.set(0, 0.19, 0);
  preview.add(previewPanel.sprite);

  villagePanel = createPanel(0.68, 0.34);
  villagePanel.sprite.position.set(0, 0.62, 0);
  villagePanel.sprite.visible = false;
  village.add(villagePanel.sprite);

  setPlacementXrUi(
    'Aim at a surface',
    'Point the right-hand ray at a tabletop.',
    'DESKBORN — SEED',
    'neutral',
  );
}

export function setPlacementXrUi(
  title: string,
  sub: string,
  eyebrow = 'DESKBORN — SEED',
  tone: PanelTone = 'neutral',
): void {
  if (!previewPanel) return;
  previewPanel.sprite.visible = true;
  paint(previewPanel, eyebrow, title, sub, tone);
}

export function hidePlacementXrUi(): void {
  if (previewPanel) previewPanel.sprite.visible = false;
}

export function setVillageXrUi(
  title: string,
  sub: string,
  eyebrow = 'DESKBORN',
  tone: PanelTone = 'neutral',
): void {
  if (!villagePanel) return;

  villagePanel.sprite.visible = true;

  if (tone === 'good') {
    villagePanel.sprite.position.set(0, 0.78, 0);
    villagePanel.sprite.scale.set(0.92, 0.46, 1);
  } else if (tone === 'danger') {
    villagePanel.sprite.position.set(0, 0.68, 0);
    villagePanel.sprite.scale.set(0.78, 0.39, 1);
  } else {
    villagePanel.sprite.position.set(0, 0.62, 0);
    villagePanel.sprite.scale.set(0.68, 0.34, 1);
  }

  paint(villagePanel, eyebrow, title, sub, tone);
}

export function hideVillageXrUi(): void {
  if (villagePanel) villagePanel.sprite.visible = false;
}

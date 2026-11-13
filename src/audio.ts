let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  const AudioContextCtor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;
  context ??= new AudioContextCtor();
  if (context.state === 'suspended') {
    void context.resume();
  }
  return context;
}

export function unlockAudio(): void {
  void getContext()?.resume();
}

function tone(
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delay = 0,
): void {
  const ctx = getContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function noise(duration: number, volume: number): void {
  const ctx = getContext();
  if (!ctx) return;

  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    const envelope = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 650;
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playPlant(): void {
  tone(330, 0.26, 0.07, 'sine');
  tone(495, 0.32, 0.055, 'sine', 0.09);
  tone(660, 0.42, 0.045, 'triangle', 0.18);
}

export function playGrab(): void {
  tone(720, 0.12, 0.035, 'sine');
}

export function playStormWarning(): void {
  tone(170, 0.45, 0.04, 'triangle');
  tone(145, 0.55, 0.035, 'triangle', 0.32);
}

export function playStormStart(): void {
  noise(0.85, 0.035);
  tone(95, 0.8, 0.025, 'sine');
}

export function playSuccess(): void {
  tone(392, 0.24, 0.055, 'sine');
  tone(523.25, 0.28, 0.05, 'sine', 0.14);
  tone(659.25, 0.42, 0.045, 'triangle', 0.28);
}

export function playFailure(): void {
  tone(220, 0.3, 0.045, 'triangle');
  tone(165, 0.45, 0.04, 'triangle', 0.19);
  tone(110, 0.6, 0.035, 'sine', 0.38);
}

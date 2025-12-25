import { getApiBaseUrl, getStoredSessionId, isRealApiEnabled } from './runtimeApi';
import type { OrderNotificationSoundPreset } from '../types';

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const beep = async (freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.12) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Some browsers require a user gesture before starting audio.
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }

  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);

  osc.connect(g);
  g.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + ms / 1000);

  await sleep(ms);
};

export const playOrderNotificationSoundPreset = async (preset: OrderNotificationSoundPreset) => {
  switch (preset) {
    case 'BELL':
      await beep(880, 260, 'sine', 0.14);
      return;
    case 'CHIME':
      await beep(659, 160, 'sine', 0.12);
      await sleep(40);
      await beep(784, 180, 'sine', 0.12);
      await sleep(40);
      await beep(988, 220, 'sine', 0.12);
      return;
    case 'BEEP':
      await beep(520, 180, 'square', 0.09);
      return;
    case 'DOUBLE_BEEP':
      await beep(520, 140, 'square', 0.09);
      await sleep(120);
      await beep(520, 140, 'square', 0.09);
      return;
    case 'ALARM':
      await beep(440, 200, 'sawtooth', 0.12);
      await sleep(40);
      await beep(520, 200, 'sawtooth', 0.12);
      await sleep(40);
      await beep(440, 200, 'sawtooth', 0.12);
      return;
    case 'CUSTOM':
    default:
      return;
  }
};

export const fetchOrderNotificationSoundBlobUrl = async (): Promise<string | null> => {
  if (!isRealApiEnabled()) return null;
  const base = getApiBaseUrl();
  if (!base) return null;
  const sessionId = getStoredSessionId();
  if (!sessionId) return null;

  const url = base.startsWith('/') ? `${base}/tenant/order-notification-sound` : `${base}/tenant/order-notification-sound`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'x-session-id': sessionId,
    },
  });

  if (!resp.ok) return null;
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
};

export const revokeObjectUrl = (url: string | null | undefined) => {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
};

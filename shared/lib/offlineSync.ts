import { flushOutbox } from './mockApi';

let isInitialized = false;

export const initOfflineSync = () => {
  if (isInitialized) return;
  isInitialized = true;

  // Best-effort: whenever the browser comes back online, replay queued mutations.
  window.addEventListener('online', () => {
    flushOutbox().catch((err) => {
      console.warn('Offline sync: flush failed', err);
    });
  });

  // If there are pending mutations from a previous offline session and we start online,
  // try to flush immediately.
  flushOutbox().catch((err) => {
    console.warn('Offline sync: initial flush failed', err);
  });
};

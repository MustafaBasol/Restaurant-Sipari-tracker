let loadingPromise: Promise<void> | null = null;

export const loadTurnstile = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script="true"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('TURNSTILE_SCRIPT_LOAD_FAILED')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TURNSTILE_SCRIPT_LOAD_FAILED'));

    document.head.appendChild(script);
  });

  return loadingPromise;
};

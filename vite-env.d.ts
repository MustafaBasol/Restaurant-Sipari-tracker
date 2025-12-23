/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_STRIPE_BACKEND_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PRINT_SERVER_URL?: string;
  // Cloudflare Turnstile site key (enables human verification on login/register UI)
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  // Comma-separated list of allowed service origins (e.g. "https://api.example.com,https://print.example.com")
  readonly VITE_SERVICE_ORIGIN_ALLOWLIST?: string;
  // Set to true only if you explicitly want to allow http:// service URLs in production.
  readonly VITE_ALLOW_INSECURE_SERVICES?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare interface Window {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        callback?: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        tabindex?: number;
      },
    ) => string;
    reset?: (widget?: string | HTMLElement) => void;
    remove?: (widget?: string | HTMLElement) => void;
  };
}

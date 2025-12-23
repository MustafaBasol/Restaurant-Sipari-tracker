/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_STRIPE_BACKEND_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PRINT_SERVER_URL?: string;
  // Comma-separated list of allowed service origins (e.g. "https://api.example.com,https://print.example.com")
  readonly VITE_SERVICE_ORIGIN_ALLOWLIST?: string;
  // Set to true only if you explicitly want to allow http:// service URLs in production.
  readonly VITE_ALLOW_INSECURE_SERVICES?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

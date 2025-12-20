/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_PRINT_SERVER_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

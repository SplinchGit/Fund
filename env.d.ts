/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID: string; // Must match actual usage
  readonly VITE_WORLD_ID_ACTION: string; // Must match actual usage
  // Add more if needed, e.g.:
  // readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

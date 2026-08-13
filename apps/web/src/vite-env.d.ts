/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly API_PORT: string;
  readonly VITE_DISABLE_ANALYSIS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

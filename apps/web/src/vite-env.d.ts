interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly API_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

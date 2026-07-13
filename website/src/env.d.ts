/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_APP_STORE_URL?: string;
  readonly PUBLIC_LEGAL_ENTITY?: string;
  readonly PUBLIC_LEGAL_ADDRESS?: string;
  readonly PUBLIC_LEGAL_JURISDICTION?: string;
  readonly PUBLIC_LEGAL_EFFECTIVE_DATE?: string;
  readonly PUBLIC_ACCESSIBILITY_AUDIT_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

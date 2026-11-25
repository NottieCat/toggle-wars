/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLAGSMITH_API_URL: string;
  readonly VITE_FLAGSMITH_DEV_KEY: string;
  readonly VITE_FLAGSMITH_PROD_KEY: string;
  readonly VITE_FLAGSMITH_PROJECT_ID: string;
  readonly VITE_FLAGSMITH_DEV_ENV_KEY: string;
  readonly VITE_FLAGSMITH_DEV_ENV_ID: string;
  readonly VITE_FLAGSMITH_PROD_ENV_KEY: string;
  readonly VITE_FLAGSMITH_PROD_ENV_ID: string;
  readonly VITE_FLAGSMITH_ADMIN_PROXY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

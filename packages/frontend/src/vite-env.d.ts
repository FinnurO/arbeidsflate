/// <reference types="vite/client" />

declare const __APP_VERSION__: string | undefined;

interface ImportMetaEnv {
  /** Set by the telemetry mock plugin (vite/telemetryMock.ts) on the dev server only */
  readonly TELEMETRY_MOCK_ENDPOINT?: string;
  /** 'true' in the static mock build (`vite build --mode pages`, vite/pagesStaticMock.ts): MSW always on, no BFF */
  readonly VITE_STATIC_MOCK?: string;
  /** Mock story used by the static mock build when the URL has no playwrightId */
  readonly VITE_STATIC_MOCK_PLAYWRIGHT_ID?: string;
}

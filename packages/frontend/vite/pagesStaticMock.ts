import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/** Vite mode that produces a static, mock-only build (no BFF, no login), e.g. for GitHub Pages. */
export const STATIC_MOCK_MODE = 'pages';

const DEFAULT_BASE = '/arbeidsflate/';
const DEFAULT_PLAYWRIGHT_ID = 'rahimi-berg';

// Placeholders in index.html that start.sh (envsubst) fills in for the nginx image. A static host
// never runs start.sh, so they are blanked here to keep Application Insights and the SSE stream off.
const INDEX_HTML_PLACEHOLDERS = [
  '$APPLICATION_INSIGHTS_INSTRUMENTATION_KEY',
  '$APPLICATION_INSIGHTS_DISABLE_DEPENDENCY_TRACKING',
  '$DIALOGPORTEN_STREAM_URL',
];

const withSlashes = (path: string) => `/${path.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');

/**
 * Static mock build, only active with `vite build --mode pages`:
 * - serves the app under STATIC_MOCK_BASE (default /arbeidsflate/)
 * - turns MSW on in the production bundle (import.meta.env.VITE_STATIC_MOCK) and defaults the
 *   mock story to STATIC_MOCK_PLAYWRIGHT_ID (default rahimi-berg) when the URL does not name one
 * - blanks the runtime config placeholders in index.html
 * - copies index.html to 404.html so deep links work on GitHub Pages
 */
export const pagesStaticMock = (): Plugin => {
  let resolved: ResolvedConfig;

  return {
    name: 'pages-static-mock',
    apply: (_config, env) => env.mode === STATIC_MOCK_MODE,
    config: () => ({
      base: withSlashes(process.env.STATIC_MOCK_BASE ?? DEFAULT_BASE),
      define: {
        'import.meta.env.VITE_STATIC_MOCK': JSON.stringify('true'),
        'import.meta.env.VITE_STATIC_MOCK_PLAYWRIGHT_ID': JSON.stringify(
          process.env.STATIC_MOCK_PLAYWRIGHT_ID ?? DEFAULT_PLAYWRIGHT_ID,
        ),
      },
    }),
    configResolved(config) {
      resolved = config;
    },
    transformIndexHtml: (html) =>
      INDEX_HTML_PLACEHOLDERS.reduce((result, placeholder) => result.replaceAll(placeholder, ''), html),
    closeBundle() {
      const outDir = resolve(resolved.root, resolved.build.outDir);
      const index = join(outDir, 'index.html');
      if (existsSync(index)) {
        copyFileSync(index, join(outDir, '404.html'));
      }
    },
  };
};

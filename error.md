# Project Error Report

Here is a summary of the current errors and warnings found during project compilation and build checks:

## 1. TypeScript Compiler Error
- **File**: `src/main.tsx` (Line 4, Column 17)
- **Error ID**: `TS5097`
- **Message**: `An import path can only end with a '.tsx' extension when 'allowImportingTsExtensions' is enabled.`
- **Context**: You are likely importing `App.tsx` with its full extension (e.g., `import App from './App.tsx'`). In standard TypeScript configurations without `allowImportingTsExtensions: true` (or without a bundler explicitly configured to allow it in TS), you should omit the `.tsx` extension: `import App from './App';`.

## 2. Server Build Warning / Runtime Error (esbuild)
- **File**: `server.ts` (Line 7)
- **Message**: `[WARNING] "import.meta" is not available with the "cjs" output format and will be empty.`
- **Context**: The `npm run build` script compiles `server.ts` into CommonJS (`dist/server.cjs`). However, `server.ts` uses ESM-specific syntax (`fileURLToPath(import.meta.url)`). 
- **Impact**: When you try to run the built production server using `node dist/server.cjs`, it throws a runtime `TypeError [ERR_INVALID_ARG_TYPE]` because `import.meta.url` is undefined in the CommonJS bundle.
- **Fix**: Either configure esbuild to output ESM (`--format=esm --outfile=dist/server.mjs`) or replace `import.meta.url` with the CommonJS `__dirname` and `__filename` equivalents in `server.ts`.

## 3. Large Bundle Size Warning (Vite)
- **File**: `dist/assets/index-pp501K2N.js` (818.10 kB)
- **Message**: `Some chunks are larger than 500 kB after minification.`
- **Context**: The main JavaScript chunk is quite large, which can impact initial page load performance.
- **Fix**: Consider implementing code-splitting (e.g., using `React.lazy()` for route components or large charting libraries like `recharts`).

## 4. Historical Python Error (Backtesting)
- **Context**: Previously, running `python3 scripts/run_backtest.py` (which has now been moved to the `unwanted/` folder) resulted in a `ModuleNotFoundError: No module named 'src.backtesting'`.
- **Note**: Since this script was moved to the `unwanted/` directory in our last step, this is likely a non-issue for the core web application, but worth noting if you ever attempt to restore and run the backtesting tools.

---
**Linting**: Clean! (`oxlint` reported 0 errors and 0 warnings).

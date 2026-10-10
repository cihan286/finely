// Stands in for the "server-only" package while tests run. Inside Next.js
// that import stops server code from being bundled for the browser; in tests
// there is no browser bundle, so it has nothing to do.
export {};

import app from "../server.js";

// Single Serverless Function fronting the whole Express app. vercel.json
// rewrites every path here, so Express does the routing — its own routes
// already carry the /api prefix.
//
// This replaces a filesystem catch-all (api/[...path].ts), which Vercel was
// matching against a single path segment only: /api/health reached the
// function but /api/auth/login 404'd at the edge before it ever ran.
export default app;

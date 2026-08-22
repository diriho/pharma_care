import app from "../server";

// A Vercel catch-all Serverless Function. It forwards every /api/* request
// to the Express application, whose routes already include the /api prefix.
export default app;

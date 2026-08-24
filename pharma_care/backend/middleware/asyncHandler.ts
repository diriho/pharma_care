import type { Request, Response, NextFunction, RequestHandler } from "express";

// Express 4 does not await async handlers: a handler that rejects never reaches
// the error middleware, so the response is never sent and Node raises an
// unhandled rejection — which on a serverless platform kills the invocation
// (Vercel reports FUNCTION_INVOCATION_FAILED). Wrap every async handler so its
// rejection is forwarded to next() and answered by the error middleware.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

import type { NextFunction, Request, Response } from "express";

export const PROMOTIONAL_DEMO_CASE_ID = "raos-promotional-demo-v2";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Keeps the fixed promotional case immutable outside its explicit admin reset
 * endpoint. This runs before all API routers so it also covers routes that
 * receive caseId in the request body instead of the URL.
 */
export function promotionalDemoReadOnly(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  const pathTargetsDemo = decodeURIComponent(req.path).split("/").includes(PROMOTIONAL_DEMO_CASE_ID);
  const bodyTargetsDemo = req.body?.caseId === PROMOTIONAL_DEMO_CASE_ID;

  if (pathTargetsDemo || bodyTargetsDemo) {
    res.status(403).json({
      error: "demo_case_read_only",
      message: "The promotional demo case is read-only. Use the administrator Guided Demo action to restore it.",
    });
    return;
  }

  next();
}
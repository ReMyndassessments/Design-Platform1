import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./authMiddleware.js";
import { canUserAccessCase } from "../lib/permissions.js";

/**
 * Authenticates the request and, for the clinical_apprentice role, enforces
 * strict read-only + per-case-assignment access on staff routers:
 *   - Any non-GET request is rejected outright (apprentices can never mutate
 *     case data, assignments, scores, reports, etc.).
 *   - Any GET under /cases/:caseId/... (or the bare /cases list) requires an
 *     active case_apprentice_assignments row for that case; the bare list
 *     endpoint (no case id) is always denied since apprentices must use
 *     /api/apprentice/cases to discover their assigned cases.
 *   - Other (non-case-scoped) GET requests — reference data such as
 *     assessment tool definitions, battery definitions, RMRA item banks,
 *     product catalogs — are allowed through, since they contain no student
 *     PII and are required to render the same read-only case pages admins see.
 * Non-apprentice roles are unaffected and proceed to their router's own
 * (school/ownership-based) permission checks.
 */
export async function apprenticeGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  await authMiddleware(req, res, async () => {
    if (req.userRole !== "clinical_apprentice") {
      next();
      return;
    }

    if (req.method !== "GET") {
      res.status(403).json({ error: "forbidden", message: "Clinical Apprentices have read-only access" });
      return;
    }

    const casesMatch = req.path.match(/^\/cases(?:\/([^\/?]+))?/);
    if (casesMatch) {
      const caseId = casesMatch[1] ? decodeURIComponent(casesMatch[1]) : undefined;
      if (!caseId) {
        res.status(403).json({ error: "forbidden", message: "Use /api/apprentice/cases to list your assigned cases" });
        return;
      }
      const allowed = await canUserAccessCase({ id: req.userId!, role: req.userRole! }, caseId);
      if (!allowed) {
        res.status(403).json({ error: "forbidden", message: "You are not assigned to this case" });
        return;
      }
    }

    next();
  });
}

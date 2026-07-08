import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./authMiddleware.js";
import { canUserAccessCase, isTestCase } from "../lib/permissions.js";

/**
 * Authenticates the request and, for the clinical_apprentice role, enforces
 * case-assignment-scoped access on staff routers:
 *   - The bare /cases list (GET, no case id) is allowed through: the route
 *     handler itself filters the result set down to only cases a mentor has
 *     explicitly assigned to the apprentice (live or test — no automatic
 *     access to every live case). Any non-GET request on the bare list (e.g.
 *     creating a case) is denied.
 *   - Any GET under /cases/:caseId/... requires an active
 *     case_apprentice_assignments row for that case, live or test.
 *   - For a case-scoped request (GET or mutation) on a "test"/training case,
 *     the apprentice is impersonated as "admin" (req.userRole is elevated)
 *     so downstream route handlers grant full read/write parity — mentors
 *     coach apprentices hands-on with zero risk since no real student data
 *     is involved. req.userId still reflects the real actor for audit trails.
 *   - For a case-scoped request on a "live" case (real student), mutations
 *     are rejected outright — apprentices remain strictly read-only.
 *   - Other (non-case-scoped) GET requests — reference data such as
 *     assessment tool definitions, battery definitions, RMRA item banks,
 *     product catalogs — are allowed through, since they contain no student
 *     PII and are required to render the same case pages admins see.
 *   - Other (non-case-scoped) non-GET requests are always rejected; these
 *     are global/shared resources (tool library, battery definitions) that
 *     apprentices should never modify, even while in a test-case session.
 * Non-apprentice roles are unaffected and proceed to their router's own
 * (school/ownership-based) permission checks.
 */
export async function apprenticeGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  await authMiddleware(req, res, async () => {
    if (req.userRole !== "clinical_apprentice") {
      next();
      return;
    }

    const casesMatch = req.path.match(/^\/cases(?:\/([^\/?]+))?/);
    if (casesMatch) {
      const caseId = casesMatch[1] ? decodeURIComponent(casesMatch[1]) : undefined;
      if (!caseId) {
        if (req.method !== "GET") {
          res.status(403).json({ error: "forbidden", message: "Clinical Apprentices cannot create or modify cases" });
          return;
        }
        next();
        return;
      }
      const allowed = await canUserAccessCase({ id: req.userId!, role: req.userRole! }, caseId);
      if (!allowed) {
        res.status(403).json({ error: "forbidden", message: "You are not assigned to this case" });
        return;
      }

      if (await isTestCase(caseId)) {
        req.actualUserRole = req.userRole;
        req.userRole = "admin";
        next();
        return;
      }

      if (req.method !== "GET") {
        res.status(403).json({ error: "forbidden", message: "Clinical Apprentices have read-only access to live cases" });
        return;
      }

      next();
      return;
    }

    if (req.method !== "GET") {
      res.status(403).json({ error: "forbidden", message: "Clinical Apprentices have read-only access" });
      return;
    }

    next();
  });
}

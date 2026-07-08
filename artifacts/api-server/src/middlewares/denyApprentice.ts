import { Request, Response, NextFunction } from "express";
import { tryAuthenticate } from "./authMiddleware.js";

/**
 * Identifies the requester (if authenticated) and blocks the clinical_apprentice
 * role from accessing legacy/staff routers. Clinical Apprentices must use the
 * dedicated /api/apprentice/* and /api/cases/:caseId/apprentice* endpoints,
 * which enforce per-case assignment checks instead of blanket access.
 *
 * Uses tryAuthenticate (not authMiddleware) because this guard is mounted
 * broadly in front of routers that also contain public, unauthenticated
 * endpoints. Those routes already enforce their own auth where needed —
 * this guard must never reject an anonymous request on their behalf.
 */
export async function denyApprentice(req: Request, res: Response, next: NextFunction): Promise<void> {
  await tryAuthenticate(req, res, () => {
    if (req.userRole === "clinical_apprentice") {
      res.status(403).json({ error: "forbidden", message: "Clinical Apprentices do not have access to this resource" });
      return;
    }
    next();
  });
}

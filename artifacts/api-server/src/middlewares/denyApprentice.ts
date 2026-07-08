import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./authMiddleware.js";

/**
 * Authenticates the request and blocks the clinical_apprentice role from
 * accessing legacy/staff routers. Clinical Apprentices must use the
 * dedicated /api/apprentice/* and /api/cases/:caseId/apprentice* endpoints,
 * which enforce per-case assignment checks instead of blanket access.
 */
export async function denyApprentice(req: Request, res: Response, next: NextFunction): Promise<void> {
  await authMiddleware(req, res, () => {
    if (req.userRole === "clinical_apprentice") {
      res.status(403).json({ error: "forbidden", message: "Clinical Apprentices do not have access to this resource" });
      return;
    }
    next();
  });
}

import { Request, Response, NextFunction } from "express";
import { getUserIdFromToken, getUserById } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      userSchool?: string;
      /** Set when apprenticeGuard elevates a clinical_apprentice to "admin" on a test/training case; preserves the real role for audit purposes. */
      actualUserRole?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  const userId = getUserIdFromToken(token);

  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "User not found" });
    return;
  }

  req.userId = userId;
  req.userRole = user.role;
  req.userSchool = user.schoolName ?? undefined;
  next();
}

/**
 * Like authMiddleware, but never sends a 401 itself. If a valid token is
 * present, req.userId/userRole/userSchool are populated as usual. If the
 * token is missing/invalid, it simply calls next() unauthenticated instead
 * of rejecting the request.
 *
 * This is used by role-scoped guards (apprenticeGuard, denyApprentice) that
 * are mounted broadly across many routers, some of which contain public,
 * unauthenticated endpoints (portal links, report-download tokens, etc).
 * Those routers already apply authMiddleware on their own protected routes,
 * so the guard only needs to identify the caller's role *when known* — it
 * must never be the one to reject an anonymous request that some other
 * route down the chain would have served without auth.
 */
export async function tryAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const userId = getUserIdFromToken(token);
  if (!userId) {
    next();
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    next();
    return;
  }

  req.userId = userId;
  req.userRole = user.role;
  req.userSchool = user.schoolName ?? undefined;
  next();
}

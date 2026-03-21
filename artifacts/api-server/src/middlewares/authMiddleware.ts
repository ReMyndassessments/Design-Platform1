import { Request, Response, NextFunction } from "express";
import { getUserIdFromToken, getUserById } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
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
  next();
}

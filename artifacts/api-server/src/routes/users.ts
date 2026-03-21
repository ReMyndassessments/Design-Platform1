import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, storeToken, revokeToken, getUserIdFromToken, getUserById } from "../lib/auth.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";

const router = Router();

router.post("/users/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "bad_request", message: "Email and password required" });
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = rows[0];

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
    return;
  }

  const token = generateToken(user.id);
  storeToken(token, user.id);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/users/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    revokeToken(authHeader.slice(7));
  }
  res.json({ success: true, message: "Logged out" });
});

router.get("/users/me", authMiddleware, async (req, res) => {
  const user = await getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
});

router.get("/users", authMiddleware, async (req, res) => {
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable);
  res.json(users);
});

export default router;

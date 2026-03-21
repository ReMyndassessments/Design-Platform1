import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, storeToken, revokeToken, getUserIdFromToken, getUserById } from "../lib/auth.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  };
}

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

  res.json({ user: formatUser(user), token });
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
  res.json(formatUser(user));
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

router.post("/users", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can create staff accounts" });
    return;
  }

  const { name, email, password, role } = req.body;
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "bad_request", message: "name, email, and password are required" });
    return;
  }
  if (!["assessment_lead", "psychometrician"].includes(role)) {
    res.status(400).json({ error: "bad_request", message: "Role must be assessment_lead or psychometrician" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "A user with this email already exists" });
    return;
  }

  const newUser = await db.insert(usersTable).values({
    id: nanoid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role,
  }).returning();

  res.status(201).json(formatUser(newUser[0]));
});

router.patch("/users/:id", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can update staff accounts" });
    return;
  }

  const { id } = req.params;
  const { name, role } = req.body;

  const target = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target[0]) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  if (target[0].role === "admin") {
    res.status(403).json({ error: "forbidden", message: "Cannot modify admin accounts" });
    return;
  }
  if (role === "admin") {
    res.status(403).json({ error: "forbidden", message: "Cannot promote users to admin" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
  if (name?.trim()) updates.name = name.trim();
  if (role && ["assessment_lead", "psychometrician"].includes(role)) updates.role = role;

  const updated = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(formatUser(updated[0]));
});

router.delete("/users/:id", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can delete staff accounts" });
    return;
  }

  const { id } = req.params;

  if (id === req.userId) {
    res.status(403).json({ error: "forbidden", message: "You cannot delete your own account" });
    return;
  }

  const target = await db.select({ id: usersTable.id, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target[0]) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  if (target[0].role === "admin") {
    res.status(403).json({ error: "forbidden", message: "Cannot delete admin accounts" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true });
});

export default router;

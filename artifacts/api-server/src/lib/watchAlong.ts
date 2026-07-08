import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getUserIdFromToken } from "./auth.js";
import { getUserById } from "./auth.js";
import { canUserAccessCase } from "./permissions.js";

interface WatchAlongClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  role: string;
  caseId: string;
}

const rooms = new Map<string, Set<WatchAlongClient>>();

function isMentorRole(role: string): boolean {
  return role !== "clinical_apprentice";
}

function broadcastPresence(caseId: string): void {
  const clients = rooms.get(caseId);
  if (!clients) return;
  const watchers = [...clients]
    .filter((c) => c.role === "clinical_apprentice")
    .map((c) => ({ userId: c.userId, userName: c.userName }));
  const payload = JSON.stringify({ type: "presence", watchers });
  for (const c of clients) {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(payload);
  }
}

function removeClient(client: WatchAlongClient): void {
  const clients = rooms.get(client.caseId);
  if (!clients) return;
  clients.delete(client);
  if (clients.size === 0) {
    rooms.delete(client.caseId);
  } else {
    broadcastPresence(client.caseId);
  }
}

export function setupWatchAlong(server: HttpServer): void {
  // Mounted under /api so the platform's shared reverse proxy (which routes
  // "/api/*" from any frontend artifact to this shared api-server) forwards
  // the WebSocket upgrade request here too.
  const wss = new WebSocketServer({ server, path: "/api/ws/watch-along" });

  wss.on("connection", async (ws, req) => {
    let client: WatchAlongClient | undefined;

    try {
      const url = new URL(req.url ?? "", "http://internal");
      const token = url.searchParams.get("token") ?? "";
      const caseId = url.searchParams.get("caseId") ?? "";

      const userId = token ? getUserIdFromToken(token) : undefined;
      if (!userId || !caseId) {
        ws.close(4001, "unauthorized");
        return;
      }

      const user = await getUserById(userId);
      if (!user) {
        ws.close(4001, "unauthorized");
        return;
      }

      const allowed = await canUserAccessCase({ id: user.id, role: user.role, school: user.schoolName ?? undefined }, caseId);
      if (!allowed) {
        ws.close(4003, "forbidden");
        return;
      }

      client = { ws, userId: user.id, userName: user.name, role: user.role, caseId };
      if (!rooms.has(caseId)) rooms.set(caseId, new Set());
      rooms.get(caseId)!.add(client);
      broadcastPresence(caseId);

      ws.on("message", (raw) => {
        if (!client) return;
        let msg: { type?: string; path?: string } | undefined;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "nav" && typeof msg.path === "string") {
          // Only real mentors/staff may drive followers' screens — never an
          // apprentice, even one elevated to admin-equivalent on a test case.
          if (!isMentorRole(client.role)) return;
          const clients = rooms.get(client.caseId);
          if (!clients) return;
          const payload = JSON.stringify({ type: "nav", path: msg.path, fromUserId: client.userId, fromUserName: client.userName });
          for (const c of clients) {
            if (c !== client && c.role === "clinical_apprentice" && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(payload);
            }
          }
        }
      });

      ws.on("close", () => {
        if (client) removeClient(client);
      });
      ws.on("error", () => {
        if (client) removeClient(client);
      });
    } catch {
      try { ws.close(4000, "error"); } catch { /* ignore */ }
    }
  });
}

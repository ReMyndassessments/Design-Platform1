---
name: Role guards mounted broadly must not hard-fail on missing auth
description: Express middleware that requires auth and is mounted via router.use(guard, subrouter) at the root path runs for every request that reaches it, not just requests destined for that subrouter — it can block unrelated public routes mounted later in the stack.
---

In `artifacts/api-server/src/routes/index.ts`, several role-scoped guards (`apprenticeGuard`, `denyApprentice`) are mounted as `router.use(guard, someRouter)`. Express pushes the guard and the subrouter as **separate stack layers at path `/`**, so the guard executes for literally every incoming request that reaches that point in the stack — including requests ultimately destined for a different, later-mounted router (e.g. public token-based routes in `external.ts`, `reportAccess.ts`, `portal.ts`, `rrfa.ts`/`rrca.ts` public passages, `storage.ts`).

If such a guard hard-rejects (401/403) when no auth token is present, it silently blocks every public/unauthenticated endpoint mounted after it, even though those endpoints have nothing to do with the guarded router. This caused a full production outage of parent/teacher portal form links (they got 401 "Link Not Found"-looking failures) after the clinical-apprentice role guard was introduced.

**Why:** every actually-protected route in this codebase already applies its own `authMiddleware` at the route level, so the shared guard doesn't need to be the enforcer of authentication — it only needs to know the caller's role *when known* to apply role-specific restrictions.

**How to apply:** any broadly-mounted guard/role-check middleware must use an auth helper that fails **open** (calls `next()` unauthenticated) when no valid token is present, e.g. `tryAuthenticate` in `authMiddleware.ts`, rather than a hard-failing `authMiddleware` that sends 401 itself. Reserve hard-failing auth checks for the specific route handlers that actually require login. When adding a new broad guard mounted before other routers, check whether any router mounted later has public/token-based endpoints — those will be silently blocked if the guard hard-fails.

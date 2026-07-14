import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem("raos_token");
        const storedEmail = await AsyncStorage.getItem("raos_email");
        if (storedToken) {
          const payload = decodeJwt(storedToken);
          setToken(storedToken);
          setUser({
            id: String(payload.userId ?? ""),
            name: storedEmail ?? "Clinician",
            email: storedEmail ?? "",
            role: String(payload.role ?? "assessment_invigilator"),
          });
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const resp = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        let message = "Invalid email or password";
        try {
          const err = await resp.json();
          if (err.message) message = err.message;
        } catch {}
        throw new Error(message);
      }
      const data = await resp.json();
      const t: string = data.token;
      const payload = decodeJwt(t);
      await AsyncStorage.setItem("raos_token", t);
      await AsyncStorage.setItem("raos_email", email);
      setToken(t);
      setUser({
        id: String(payload.userId ?? ""),
        name: email.split("@")[0],
        email,
        role: String(payload.role ?? "assessment_invigilator"),
      });
      router.replace("/");
    },
    [router]
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(["raos_token", "raos_email"]);
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { API_BASE };

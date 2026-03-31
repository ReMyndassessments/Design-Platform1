import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useLogin, useGetCurrentUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const l = t.login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: user, isLoading: isCheckingUser } = useGetCurrentUser({
    query: { retry: false, refetchOnWindowFocus: false }
  });

  const hasRedirected = useRef(false);
  useEffect(() => {
    if (!isCheckingUser && user && !hasRedirected.current) {
      hasRedirected.current = true;
      setLocation("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingUser, user]);

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          if (data?.token) {
            localStorage.setItem("raos_token", data.token);
          }
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            title: "Login failed",
            description: "Please check your credentials and try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isCheckingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">

      {/* Back + Language switcher row */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-between">
        <Link href="/">
          <span className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <ChevronLeft size={15} /> {t.back.replace("← ", "")}
          </span>
        </Link>
        <LanguageSwitcherLight />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-8">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">ReMynd</p>
            <p className="text-xs text-slate-400 mt-0.5">{l.staffPortal}</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">{l.signIn}</h2>
        <p className="text-slate-400 text-sm mb-6">{l.signInDesc}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">{l.email}</label>
            <Input
              type="email"
              placeholder="name@remynd.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">{l.password}</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 mt-2 group"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin mr-2" /> {l.signingIn}</>
            ) : (
              <>{l.signInBtn} <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" /></>
            )}
          </Button>

          {!import.meta.env.PROD && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">
              <p className="font-semibold mb-1 text-slate-700 text-xs">{l.demoAccounts}</p>
              <ul className="space-y-0.5 text-xs">
                <li>admin@remynd.com</li>
                <li>hayley@remynd.com</li>
                <li>abegail@remynd.com</li>
                <li className="italic mt-1 text-slate-400">Password: password</li>
              </ul>
            </div>
          )}
        </form>
      </div>

    </div>
  );
}

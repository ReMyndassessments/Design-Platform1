import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useGetCurrentUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const { data: user, isLoading: isCheckingUser } = useGetCurrentUser({
    query: { retry: false, refetchOnWindowFocus: false }
  });

  useEffect(() => {
    if (!isCheckingUser && user) {
      setLocation("/");
    }
    // setLocation is stable in wouter; intentionally excluded from deps
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
          setLocation("/");
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
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Mobile top / Desktop left — dark branding panel */}
      <div className="md:w-1/2 bg-slate-900 text-white relative overflow-hidden flex flex-col justify-center items-center p-10 md:p-12 py-14 md:py-0">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-3xl" />

        <div className="z-10 text-center max-w-md w-full">
          <div className="mb-6 mx-auto w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 tracking-tight text-white">
            ReMynd Assessment Operating System
          </h1>
          {/* Subtitle shown on desktop only */}
          <p className="hidden md:block text-lg text-slate-300 leading-relaxed">
            The intelligent operating system for psychoeducational assessments. Streamline forms, scoring, and report generation in one secure platform.
          </p>
          {/* Welcome text shown on mobile only */}
          <div className="md:hidden mt-4">
            <p className="text-2xl font-bold text-white">Welcome back</p>
            <p className="text-slate-400 mt-1 text-sm">Please sign in to your account.</p>
          </div>
        </div>
      </div>

      {/* Mobile bottom / Desktop right — form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white md:rounded-l-3xl shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)] z-10 relative">
        <div className="w-full max-w-md animate-slide-up">
          {/* Welcome text shown on desktop only */}
          <div className="hidden md:block mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2 text-sm">Please sign in to your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
              <Input
                type="email"
                placeholder="name@remynd.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base mt-4 group"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
              {!loginMutation.isPending && <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>

            {!import.meta.env.PROD && (
              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                <p className="font-semibold mb-1 text-slate-800">Demo Accounts:</p>
                <ul className="space-y-1">
                  <li>admin@remynd.com</li>
                  <li>hayley@remynd.com</li>
                  <li>abegail@remynd.com</li>
                  <li className="italic text-xs mt-2 text-slate-400">Password: password</li>
                </ul>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

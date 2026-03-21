import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useGetCurrentUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, ArrowRight, Loader2 } from "lucide-react";
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
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

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

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50">
      {/* Left side - Branding */}
      <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-slate-900 text-white p-12 relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-3xl" />
        
        <div className="z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-8 mx-auto shadow-2xl border border-white/20">
            <BrainCircuit size={48} strokeWidth={2} />
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-6 tracking-tight">
            ReMynd Assessment
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            The intelligent operating system for psychoeducational assessments. Streamline forms, scoring, and report generation in one secure platform.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white md:rounded-l-3xl shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)] z-10 relative">
        <div className="w-full max-w-md animate-slide-up">
          <div className="md:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/30">
              <BrainCircuit size={32} />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">RAOS</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900">Welcome back</h2>
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
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-slate-700">Password</label>
              </div>
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
            
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
              <p className="font-semibold mb-1 text-slate-800">Demo Accounts:</p>
              <ul className="space-y-1">
                <li>admin@remynd.com</li>
                <li>hayley@remynd.com</li>
                <li>abegail@remynd.com</li>
                <li className="italic text-xs mt-2 text-slate-400">Password: password</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

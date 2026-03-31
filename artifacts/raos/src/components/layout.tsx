import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCog,
  Inbox,
} from "lucide-react";
import { useState } from "react";
import { useGetCurrentUser, useLogout, customFetch } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data: user } = useGetCurrentUser();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();

  const { data: newInquiryCount = 0 } = useQuery<number>({
    queryKey: ["inquiries-new-count"],
    queryFn: async () => {
      const rows = await customFetch<Array<{ status: string }>>("/api/portal/inquiries");
      return rows.filter((r) => r.status === "new").length;
    },
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("raos_token");
        queryClient.clear();
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cases", label: "Cases", icon: Users },
    ...(user?.role !== "assessment_invigilator" ? [{ href: "/tools", label: "Assessment Tools", icon: Settings }] : []),
    ...(user?.role === "admin" ? [{ href: "/inquiries", label: "Inquiries", icon: Inbox }] : []),
    ...(user?.role === "admin" ? [{ href: "/team", label: "Team", icon: UserCog }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md border"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight leading-none text-white">RAOS</h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">ReMynd Assessment</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const badge = item.href === "/inquiries" && newInquiryCount > 0 ? newInquiryCount : null;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/20 text-primary-foreground font-medium" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon size={20} className={cn(
                  "transition-colors",
                  isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-white"
                )} />
                <span className="flex-1">{item.label}</span>
                {badge !== null && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white mr-3">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-10 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

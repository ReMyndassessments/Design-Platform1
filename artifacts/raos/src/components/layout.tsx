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
  Video,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useGetCurrentUser, useLogout, customFetch } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function generateRoomSlug(): string {
  const words = ["maple", "cedar", "river", "cloud", "summit", "beacon", "coral", "harbor", "silver", "forest"];
  const a = words[Math.floor(Math.random() * words.length)];
  const b = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `remynd-${a}-${b}-${n}`;
}

function QuickMeetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [room, setRoom] = useState(() => generateRoomSlug());
  const [copied, setCopied] = useState(false);

  const base = window.location.origin;
  const guestUrl = `${base}/meet/${room}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [guestUrl]);

  const handleRefresh = () => {
    setRoom(generateRoomSlug());
    setCopied(false);
  };

  const handleJoinAsHost = () => {
    window.open(`${base}/meet/${room}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Video size={14} className="text-emerald-600" />
            </div>
            Quick Meet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <p className="text-sm text-slate-500">
            Generate a secure ReMynd meeting room and share the link. The branded join page requires no account or app download.
          </p>

          {/* Room name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Room name
            </label>
            <div className="flex gap-2">
              <Input
                value={room}
                onChange={(e) => { setRoom(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-")); setCopied(false); }}
                className="flex-1 font-mono text-sm"
              />
              <button
                onClick={handleRefresh}
                title="Generate new room name"
                className="shrink-0 w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Guest link */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Guest link — share this
            </label>
            <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="flex-1 text-xs text-slate-600 truncate font-mono">{guestUrl}</span>
              <button
                onClick={handleCopy}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                  copied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                )}
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleJoinAsHost}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <ExternalLink size={15} />
              Join as Host
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Room links are not stored — anyone with the link can join. Share only with intended participants.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quickMeetOpen, setQuickMeetOpen] = useState(false);
  
  const { data: user } = useGetCurrentUser();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();

  const { data: newInquiryCount = 0 } = useQuery<number>({
    queryKey: ["inquiries-new-count"],
    queryFn: async () => {
      const rows = await customFetch<Array<{ status: string }>>("/api/portal/inquiries");
      return rows.filter((r) => r.status === "new").length;
    },
    enabled: user?.role === "admin" || user?.role === "assessment_invigilator",
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
    ...(user?.role === "admin" || user?.role === "assessment_invigilator" ? [{ href: "/inquiries", label: "Inquiries", icon: Inbox }] : []),
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

        {/* Quick Meet — admin only */}
        {user?.role === "admin" && (
          <div className="px-4 pb-3">
            <button
              onClick={() => { setQuickMeetOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all duration-200 group"
            >
              <Video size={18} className="shrink-0" />
              <span className="flex-1 text-left text-sm font-medium">Quick Meet</span>
              <ExternalLink size={13} className="text-emerald-500/60 group-hover:text-emerald-400 transition-colors" />
            </button>
          </div>
        )}

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

      {/* Quick Meet Dialog */}
      {user?.role === "admin" && (
        <QuickMeetDialog open={quickMeetOpen} onClose={() => setQuickMeetOpen(false)} />
      )}
    </div>
  );
}

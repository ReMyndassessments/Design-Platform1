import { useState } from "react";
import { useParams } from "wouter";
import { Video, ShieldCheck, Mic, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function QuickMeetPage() {
  const params = useParams<{ room: string }>();
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  const roomName = params.room ?? "remynd-meeting";

  function joinMeeting() {
    if (!name.trim()) return;
    setJoining(true);
    // Navigate directly to Jitsi — embedding via External API fails behind proxies/iframes.
    // Pass the display name and minimal config via the URL fragment.
    const fragment = [
      `config.startWithAudioMuted=true`,
      `config.disableDeepLinking=true`,
      `config.prejoinPageEnabled=false`,
      `config.subject="ReMynd Student Services"`,
      `userInfo.displayName="${encodeURIComponent(name.trim())}"`,
    ].join("&");
    window.location.href = `https://meet.ffmuc.net/${roomName}#${fragment}`;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #f8fafc 100%)" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-white/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center">
            <img
              src="/images/remynd-logo.png"
              alt="ReMynd"
              className="w-6 h-6 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div>
            <p className="text-slate-800 font-bold text-sm leading-tight tracking-tight">ReMynd Student Services</p>
            <p className="text-emerald-600 text-[10px] font-medium tracking-wider uppercase">Virtual Meeting</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <ShieldCheck size={13} />
          Secure & private
        </div>
      </div>

      {/* Pre-join lobby */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">

          {/* Logo block */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border border-emerald-100 flex items-center justify-center mb-4">
              <img
                src="/images/remynd-logo.png"
                alt="ReMynd"
                className="w-14 h-14 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 text-center leading-tight">
              You've been invited to a<br />
              <span className="text-emerald-600">ReMynd meeting</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 text-center max-w-xs">
              Enter your name so the host knows you're here, then click Join whenever you're ready.
            </p>
          </div>

          {/* Join form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Your name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") joinMeeting(); }}
                placeholder="e.g. Mr. Johnson, Ms. Lee…"
                className="text-base h-11 border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                autoFocus
                disabled={joining}
              />
            </div>

            <Button
              size="lg"
              onClick={joinMeeting}
              disabled={joining || !name.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 text-base font-semibold rounded-xl shadow-md shadow-emerald-100 gap-2.5 transition-all"
            >
              {joining ? (
                <><Loader2 size={18} className="animate-spin" /> Connecting…</>
              ) : (
                <><Video size={18} /> Join the Meeting</>
              )}
            </Button>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {[
              { icon: <Video size={12} />, label: "No download required" },
              { icon: <Mic size={12} />, label: "Works in your browser" },
              { icon: <Camera size={12} />, label: "Camera off by default" },
            ].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
                <span className="text-emerald-500">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-5 px-4">
            ReMynd Student Services · Confidential consultation
          </p>
        </div>
      </div>
    </div>
  );
}

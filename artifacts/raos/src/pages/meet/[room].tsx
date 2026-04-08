import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Loader2, Video, ShieldCheck, Mic, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: object) => { dispose: () => void };
  }
}

export default function QuickMeetPage() {
  const params = useParams<{ room: string }>();
  const search = useSearch();
  const qs = new URLSearchParams(search);
  const prefillName = qs.get("name") ?? "";

  const [name, setName] = useState(prefillName);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);

  const roomName = params.room ?? "remynd-meeting";

  function loadScript(): Promise<void> {
    return new Promise((resolve) => {
      const existing = document.getElementById("jitsi-external-api-script");
      if (existing) { resolve(); return; }
      const script = document.createElement("script");
      script.id = "jitsi-external-api-script";
      script.src = "https://meet.ffmuc.net/external_api.js";
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  async function startMeeting() {
    if (!name.trim()) return;
    setLoading(true);
    await loadScript();
    setJoined(true);
  }

  useEffect(() => {
    if (!joined) return;
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !window.JitsiMeetExternalAPI) return;
      const h = el.getBoundingClientRect().height || window.innerHeight - 65;
      const w = el.getBoundingClientRect().width || window.innerWidth;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.ffmuc.net", {
        roomName,
        parentNode: el,
        width: w,
        height: h,
        userInfo: { displayName: name.trim() },
        configOverwrite: {
          startWithAudioMuted: true,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          subject: "ReMynd Student Services",
          toolbarButtons: [
            "microphone", "camera", "hangup", "chat", "raisehand", "tileview", "fullscreen", "participants-pane",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          APP_NAME: "ReMynd Student Services",
          DEFAULT_BACKGROUND: "#0f172a",
        },
      });
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [joined, roomName, name]);

  useEffect(() => {
    return () => { apiRef.current?.dispose(); };
  }, []);

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

      {/* Pre-join screen */}
      {!joined && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">

          {/* Card */}
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
                  onKeyDown={(e) => { if (e.key === "Enter") startMeeting(); }}
                  placeholder="e.g. Mr. Johnson, Ms. Lee…"
                  className="text-base h-11 border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
                  autoFocus
                />
              </div>

              <Button
                size="lg"
                onClick={startMeeting}
                disabled={loading || !name.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 text-base font-semibold rounded-xl shadow-md shadow-emerald-100 gap-2.5 transition-all"
              >
                {loading ? (
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
      )}

      {/* Loading overlay */}
      {joined && loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
            <p className="text-sm">Connecting to meeting room…</p>
          </div>
        </div>
      )}

      {/* Jitsi container */}
      <div
        ref={containerRef}
        className={joined ? "flex-1 overflow-hidden" : "hidden"}
      />
    </div>
  );
}

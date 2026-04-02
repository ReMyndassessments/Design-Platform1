import { useEffect, useRef, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Loader2, Video, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: object) => { dispose: () => void };
  }
}

export default function JoinMeetingPage() {
  const params = useParams<{ room: string }>();
  const search = useSearch();
  const qs = new URLSearchParams(search);
  const studentName = qs.get("student") ?? "";
  // jitsiRoom overrides the route param when it's a moderated room (e.g. "moderated/XXXX")
  const roomName = qs.get("jitsiRoom") ?? params.room;

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const sessionLabel = studentName
    ? `ReMynd Debrief — ${studentName}`
    : "ReMynd Session";

  function loadScript(): Promise<void> {
    return new Promise((resolve) => {
      const existing = document.getElementById("jitsi-external-api-script");
      if (existing) { resolve(); return; }
      const script = document.createElement("script");
      script.id = "jitsi-external-api-script";
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  async function startMeeting() {
    setLoading(true);
    await loadScript();
    setJoined(true);
  }

  useEffect(() => {
    if (!joined) return;
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !window.JitsiMeetExternalAPI) return;

      // Measure actual rendered pixel dimensions so Jitsi fills the space exactly
      const h = el.getBoundingClientRect().height || window.innerHeight - 65;
      const w = el.getBoundingClientRect().width || window.innerWidth;

      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: el,
        width: w,
        height: h,
        configOverwrite: {
          startWithAudioMuted: true,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          subject: sessionLabel,
          toolbarButtons: [
            "microphone", "camera", "hangup", "chat", "raisehand", "tileview", "fullscreen",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          APP_NAME: "ReMynd Student Services",
          DEFAULT_BACKGROUND: "#0f172a",
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        },
      });

      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [joined, roomName, sessionLabel]);

  useEffect(() => {
    return () => { apiRef.current?.dispose(); };
  }, []);

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/images/remynd-logo.png"
            alt="ReMynd"
            className="w-8 h-8 object-contain brightness-0 invert"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">ReMynd Student Services</p>
            {studentName && (
              <p className="text-slate-400 text-xs leading-tight">{sessionLabel}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <ShieldCheck size={13} />
          Secure meeting room
        </div>
      </div>

      {/* Pre-join screen */}
      {!joined && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <div className="text-center space-y-3 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Video size={28} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {studentName ? `Debrief — ${studentName}` : "Join Meeting"}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              You have been invited to a ReMynd debrief session. When you are ready, click the button below to join. No account or download is required.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {["No download required", "Works in your browser", "Secure & private"].map((t) => (
              <span key={t} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-full px-3 py-1">
                {t}
              </span>
            ))}
          </div>

          <Button
            size="lg"
            onClick={startMeeting}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-base font-semibold rounded-xl shadow-lg shadow-emerald-900/40 gap-3"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Connecting…</>
            ) : (
              <><Video size={18} /> Join the Meeting</>
            )}
          </Button>

          <p className="text-slate-600 text-xs text-center max-w-xs">
            Your camera and microphone will not be turned on automatically. You can enable them once you are inside the room.
          </p>
        </div>
      )}

      {/* Jitsi container — always in DOM once joined so ref is stable */}
      <div
        ref={containerRef}
        className={joined ? "flex-1 overflow-hidden" : "hidden"}
      />
    </div>
  );
}

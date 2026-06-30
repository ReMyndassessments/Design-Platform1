import { useState } from "react";
import { useLocation } from "wouter";

const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function MyPortalLogin() {
  const [, navigate] = useLocation();
  const [caseId, setCaseId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/external/portal-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseId.trim(), accessCode: accessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Login failed. Please check your credentials.");
        return;
      }
      navigate(`/external/${data.token}`);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">My Assessment Portal</h1>
          <p className="text-sm text-slate-500 mt-1">ReMynd Student Services</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <p className="text-sm text-slate-600 mb-6 text-center leading-relaxed">
            Enter your <span className="font-semibold text-slate-800">Bobby-AI Case ID</span> and{" "}
            <span className="font-semibold text-slate-800">Access Code</span> to access your portal.
            These were provided in your debrief email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Case ID
              </label>
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g. CASE-HZ062U"
                autoComplete="username"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Access Code
              </label>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Your access code"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition font-mono"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !caseId || !accessCode}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : "Access My Portal"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Don't have your credentials?{" "}
              <a href="/portal?tab=parent" className="text-indigo-500 hover:underline">Contact us</a>
            </p>
            <p className="text-xs text-slate-400">
              <a href="/" className="text-slate-400 hover:text-indigo-500 transition-colors">← Back to home</a>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-300 mt-6">
          © {new Date().getFullYear()} ReMynd Student Services · Confidential
        </p>
      </div>
    </div>
  );
}

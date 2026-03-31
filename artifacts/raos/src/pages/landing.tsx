import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white flex flex-col lg:flex-row">

      {/* Left — Brand panel — exactly matches login page left panel */}
      <div className="lg:w-1/2 bg-slate-900 text-white relative overflow-hidden flex flex-col justify-between px-10 py-12">
        {/* Background blobs — same as login page */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-3xl" />

        {/* Logo */}
        <div className="z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-sm font-bold tracking-wide text-white">ReMynd</span>
        </div>

        {/* Main content */}
        <div className="z-10 mt-16 lg:mt-0">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase mb-4">
            Assessment Operating System
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6 text-white">
            Psychoeducational<br />Assessment,<br />Professionally Managed.
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-sm mb-10">
            RAOS is ReMynd's specialist platform for end-to-end management of psychoeducational assessments — from initial referral through to report delivery and debrief.
          </p>

          <div className="space-y-3">
            {[
              "Full case lifecycle tracking",
              "Standardised scoring across 60+ instruments",
              "Role-based access for all assessment staff",
              "Secure digital form delivery and administration",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="z-10 mt-12 lg:mt-0 text-xs text-slate-600">
          © {new Date().getFullYear()} ReMynd Pty Ltd · Confidential
        </p>
      </div>

      {/* Right — Access panel */}
      <div className="lg:w-1/2 flex flex-col justify-center px-10 py-16 bg-white">
        <div className="max-w-sm mx-auto w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome</h2>
          <p className="text-gray-400 text-sm mb-10">Select your access pathway below.</p>

          <div className="space-y-4">
            <Link href="/portal">
              <div className="group border border-gray-200 hover:border-slate-400 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">Schools &amp; Parents</p>
                    <p className="text-xs text-gray-400">Submit a referral or make an enquiry</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors border border-gray-100">
                    <span className="text-gray-400 group-hover:text-slate-700 text-sm transition-colors">→</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/login">
              <div className="group border border-gray-200 hover:border-slate-400 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">Assessment Staff</p>
                    <p className="text-xs text-gray-400">Sign in to the RAOS platform</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors border border-gray-100">
                    <span className="text-gray-400 group-hover:text-slate-700 text-sm transition-colors">→</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <p className="mt-10 text-xs text-gray-300 text-center">
            Authorised access only. All activity is logged and monitored.
          </p>
        </div>
      </div>

    </div>
  );
}

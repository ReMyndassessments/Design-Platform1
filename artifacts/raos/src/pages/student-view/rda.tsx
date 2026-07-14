export const RDA_ITEMS = [
  { id: "rda_1",  word: "mip" },
  { id: "rda_2",  word: "tave" },
  { id: "rda_3",  word: "blon" },
  { id: "rda_4",  word: "strav" },
  { id: "rda_5",  word: "nake" },
  { id: "rda_6",  word: "fim" },
  { id: "rda_7",  word: "lape" },
  { id: "rda_8",  word: "plinder" },
  { id: "rda_9",  word: "glost" },
  { id: "rda_10", word: "drant" },
  { id: "rda_11", word: "skeep" },
  { id: "rda_12", word: "brinter" },
  { id: "rda_13", word: "chab" },
  { id: "rda_14", word: "flape" },
  { id: "rda_15", word: "snorp" },
  { id: "rda_16", word: "tralip" },
  { id: "rda_17", word: "voster" },
  { id: "rda_18", word: "splent" },
  { id: "rda_19", word: "crund" },
  { id: "rda_20", word: "bralisko" },
];

export default function RdaStudentView() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 16px !important; padding: 24px !important; }
          .print-tile { border: 1.5px solid #e2e8f0 !important; border-radius: 12px !important; padding: 20px 10px !important; text-align: center !important; break-inside: avoid !important; }
          .print-num { font-size: 10px !important; color: #94a3b8 !important; display: block !important; margin-bottom: 6px !important; }
          .print-word { font-size: 30px !important; font-weight: 700 !important; font-family: monospace !important; color: #1e293b !important; display: block !important; }
          .print-header { padding: 16px 24px 8px !important; border-bottom: 1px solid #e2e8f0 !important; display: flex !important; justify-content: space-between !important; align-items: center !important; }
        }
      `}</style>

      <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between print-header">
        <div>
          <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase block">ReMynd Decoding Assessment</span>
          <span className="text-xs text-slate-400">Read each word aloud. Take your time.</span>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 rounded-lg px-4 py-2 transition-colors"
        >
          🖨️ Print
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 print-grid">
            {RDA_ITEMS.map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col items-center gap-2 bg-slate-50 rounded-2xl py-7 px-4 border border-slate-100 select-none print-tile"
              >
                <span className="text-xs text-slate-400 font-medium tabular-nums print-num">{idx + 1}</span>
                <span className="text-4xl font-bold text-slate-800 tracking-wide font-mono leading-none print-word">
                  {item.word}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

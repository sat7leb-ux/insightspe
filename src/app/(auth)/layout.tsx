import type { ReactNode } from "react";
import { Radio } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1e3a8a 0%, #172554 100%)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 70% -10%, rgba(96,165,250,0.25), transparent), radial-gradient(ellipse 60% 50% at 10% 110%, rgba(245,158,11,0.15), transparent)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: "rgba(255,255,255,0.14)" }}>
            <Radio size={20} />
          </div>
          <div>
            <p className="font-bold text-[16px] leading-tight">SAT-7 Insights</p>
            <p className="text-[12px] text-blue-200 leading-tight">Public Engagement Portal</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-[30px] font-bold leading-snug max-w-md">
            See every event, every conversation, every life touched.
          </h1>
          <p className="mt-4 text-[14px] text-blue-200 max-w-md leading-relaxed">
            The Insights Portal brings offline and digital engagement together — church partnerships, school
            visits, festivals and campaigns, side by side with channel performance.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            {[
              ["Events", "Tracked end-to-end"],
              ["Daily reports", "Multi-day coverage"],
              ["Analytics", "Offline + digital"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="font-semibold text-[13px]">{t}</p>
                <p className="text-[11px] text-blue-200 mt-0.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[11.5px] text-blue-300">© 2026 SAT-7 · Internal use only</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm fade-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl grid place-items-center text-white" style={{ background: "var(--brand)" }}>
              <Radio size={18} />
            </div>
            <div>
              <p className="font-bold text-[15px] leading-tight">SAT-7 Insights</p>
              <p className="text-[11px] text-slate-500 leading-tight">Public Engagement Portal</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { CheckCircle, BarChart3, Building2, Shield, Zap, Sparkles, ArrowRight, Activity, DollarSign, FileText } from 'lucide-react';
import './_group.css';

const SCENE_DURATION = 4000;

export function PromoAnimation() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % 5);
    }, SCENE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      className="relative flex items-center justify-center text-slate-50"
      style={{ width: 1280, height: 720, overflow: 'hidden', backgroundColor: '#0a0f1e', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", flexShrink: 0 }}
    >
      <div className="grain-overlay" />

      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] animate-float" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[120px] animate-float-reverse" />

      {/* Brand Watermark */}
      <div className="absolute top-8 left-10 flex items-center gap-3 z-50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">ComplyBook</span>
      </div>

      {/* Scene indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: currentScene === i ? 24 : 8,
              height: 8,
              backgroundColor: currentScene === i ? '#3b82f6' : 'rgba(148,163,184,0.4)',
            }}
          />
        ))}
      </div>

      {/* Scenes Container */}
      <div className="relative w-full h-full flex items-center justify-center">

        {/* Scene 1: Opening Hook */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ opacity: currentScene === 0 ? 1 : 0, transform: currentScene === 0 ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 0.7s ease, transform 0.7s ease', pointerEvents: currentScene === 0 ? 'auto' : 'none' }}
        >
          <div className="text-center max-w-4xl relative z-10">
            <h1 className="text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              <span className="block animate-type">Financial Compliance,</span>
              <span
                className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 animate-type"
                style={{ animationDelay: '1.5s' }}
              >
                Finally Simple.
              </span>
            </h1>
            <p
              className="text-2xl text-slate-400 font-medium tracking-wide animate-pop-in"
              style={{ animationDelay: '3s', opacity: 0 }}
            >
              Built for nonprofits and small businesses.
            </p>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
        </div>

        {/* Scene 2: AI Auto-Categorization */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: currentScene === 1 ? 1 : 0, transform: currentScene === 1 ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 0.7s ease, transform 0.7s ease', pointerEvents: currentScene === 1 ? 'auto' : 'none' }}
        >
          <div className="w-[1000px] bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <Zap className="text-blue-500 w-8 h-8" />
                  AI-Powered Auto-Categorization
                </h2>
                <p className="text-slate-400 mt-2">Zero-touch bookkeeping</p>
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full font-semibold border border-blue-500/20 animate-pulse">
                <Sparkles className="w-5 h-5" />
                AI Active
              </div>
            </div>

            <div className="space-y-4">
              {[
                { name: "Colorado Health Foundation Grant", amount: "+$25,000.00", cat: "Grant Revenue", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
                { name: "Gusto Payroll - Biweekly", amount: "-$14,250.32", cat: "Program Services", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
                { name: "Google Workspace", amount: "-$142.50", cat: "Management & General", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
              ].map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50"
                  style={{ animation: `slide-in-right 0.6s ease-out forwards ${i * 0.4}s`, opacity: currentScene === 1 ? 1 : 0 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                      <DollarSign className="text-slate-300 w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{tx.name}</h4>
                      <p className="text-slate-400 text-sm">Just now</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`text-xl font-bold ${tx.amount.startsWith('+') ? 'text-emerald-400' : 'text-slate-200'}`}>{tx.amount}</span>
                    <div
                      className={`px-4 py-2 rounded-lg border font-semibold text-sm animate-pop-in ${tx.color}`}
                      style={{ animationDelay: `${(i * 0.4) + 0.6}s`, opacity: 0 }}
                    >
                      {tx.cat}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scene 3: Bank Reconciliation */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: currentScene === 2 ? 1 : 0, transform: currentScene === 2 ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 0.7s ease, transform 0.7s ease', pointerEvents: currentScene === 2 ? 'auto' : 'none' }}
        >
          <div className="w-[1100px] flex flex-col items-center">
            <h2 className="text-4xl font-bold mb-12 flex items-center gap-3">
              <Activity className="text-cyan-400 w-10 h-10" />
              One-Click Bank Reconciliation
            </h2>

            <div className="flex w-full gap-8 relative">
              {/* Bank Side */}
              <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
                <h3 className="text-xl font-semibold text-slate-400 mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Chase Bank Statement
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between">
                    <span>#1042 - Vendor Pmt</span>
                    <span className="font-bold">-$450.00</span>
                  </div>
                  <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex justify-between">
                    <span>Donation Dep</span>
                    <span className="font-bold text-emerald-400">+$1,200.00</span>
                  </div>
                </div>
              </div>

              {/* Connecting Lines */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-full flex flex-col justify-center gap-4 z-10 pointer-events-none">
                <div className="w-full h-[2px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-emerald-400/0 animate-draw-line" style={{ opacity: 0, animationDelay: '1s' }} />
                <div className="w-full h-[2px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-emerald-400/0 animate-draw-line mt-12" style={{ opacity: 0, animationDelay: '1.5s' }} />
              </div>

              {/* Book Side */}
              <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
                <h3 className="text-xl font-semibold text-slate-400 mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> ComplyBook Ledger
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 flex justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-400/10 animate-pulse" />
                    <span className="relative z-10">Office Supplies</span>
                    <span className="font-bold relative z-10">-$450.00</span>
                  </div>
                  <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-500/30 flex justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-400/10 animate-pulse" />
                    <span className="relative z-10">Individual Giving</span>
                    <span className="font-bold text-emerald-400 relative z-10">+$1,200.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Badge */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-emerald-500 rounded-2xl p-6 flex flex-col items-center shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-pop-in z-20"
              style={{ animationDelay: '2.5s', opacity: 0 }}
            >
              <CheckCircle className="text-emerald-400 w-16 h-16 mb-2" />
              <span className="text-2xl font-bold text-emerald-400">Reconciled</span>
            </div>
          </div>
        </div>

        {/* Scene 4: Grant & Compliance Reporting */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: currentScene === 3 ? 1 : 0, transform: currentScene === 3 ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 0.7s ease, transform 0.7s ease', pointerEvents: currentScene === 3 ? 'auto' : 'none' }}
        >
          <div className="w-[1000px] flex items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl font-bold mb-6 flex items-center gap-3">
                <BarChart3 className="text-blue-500 w-10 h-10" />
                Grant Tracking &amp; Reports
              </h2>
              <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                Generate IRS-ready 990 reports and track restricted funds in real-time.
              </p>

              <div className="space-y-6">
                {[
                  { label: "Education Program", val: "42%", width: "42%", color: "bg-blue-500" },
                  { label: "Management & Gen", val: "18%", width: "18%", color: "bg-purple-500" },
                  { label: "Fundraising", val: "12%", width: "12%", color: "bg-cyan-400" },
                ].map((bar, i) => (
                  <div key={i} className="relative">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{bar.label}</span>
                      <span className="text-slate-400">{bar.val}</span>
                    </div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar.color} rounded-full`}
                        style={{
                          width: bar.width,
                          animation: `slide-in-left 1s ease-out forwards ${(i * 0.3) + 0.5}s`,
                          transform: 'translateX(-100%)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-[400px] h-[400px] relative flex items-center justify-center flex-shrink-0">
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
              <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray="100 252" className="animate-draw-line" style={{ animationDelay: '1s', opacity: 0 }} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="20" strokeDasharray="45 252" strokeDashoffset="-100" className="animate-draw-line" style={{ animationDelay: '1.3s', opacity: 0 }} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22d3ee" strokeWidth="20" strokeDasharray="30 252" strokeDashoffset="-145" className="animate-draw-line" style={{ animationDelay: '1.6s', opacity: 0 }} />
              </svg>

              <div className="absolute flex flex-col items-center justify-center animate-pop-in" style={{ animationDelay: '2.2s', opacity: 0 }}>
                <Shield className="w-12 h-12 text-emerald-400 mb-2" />
                <span className="text-lg font-bold text-emerald-400 text-center uppercase tracking-widest">IRS Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scene 5: Closing CTA */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ opacity: currentScene === 4 ? 1 : 0, transform: currentScene === 4 ? 'scale(1)' : 'scale(0.95)', transition: 'opacity 0.7s ease, transform 0.7s ease', pointerEvents: currentScene === 4 ? 'auto' : 'none' }}
        >
          {/* Grid pattern background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Glow orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[100px] animate-pulse" />

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full px-5 py-2 text-sm font-semibold mb-8 animate-pop-in">
              <CheckCircle className="w-4 h-4" />
              Free to start — no credit card required
            </div>

            <h2 className="text-7xl font-extrabold tracking-tight mb-4 text-white animate-type">complybook.net</h2>
            <p className="text-2xl text-slate-400 mb-12 animate-pop-in" style={{ animationDelay: '0.5s', opacity: 0 }}>
              Trusted by nonprofits across Colorado.
            </p>

            <button
              className="px-10 py-5 bg-blue-600 text-white text-2xl font-bold rounded-2xl flex items-center gap-4 mx-auto btn-glow shadow-xl shadow-blue-600/30 group"
              style={{ border: '1px solid rgba(59,130,246,0.5)' }}
            >
              Start Free Trial
              <ArrowRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

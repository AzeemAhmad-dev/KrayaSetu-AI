import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Train,
  Sparkles,
  Info
} from "lucide-react";
import { ProvenanceBadge } from "../components/common/ProvenanceBadge";
import { useAuth, DEMO_CREDENTIALS_LIST, DEMO_ACCOUNTS_REGISTRY } from "../context/AuthContext";
import { StationSelectionModal } from "../components/station/StationSelectionModal";
import logoImg from "../assets/logo.jpg";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, currentRole } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autofilledUser, setAutofilledUser] = useState<string | null>(null);
  const [showStationModal, setShowStationModal] = useState(false);

  // If already authenticated, redirect to the user's role workspace
  React.useEffect(() => {
    if (isAuthenticated && currentRole.defaultPath && currentRole.defaultPath !== "/login") {
      navigate(currentRole.defaultPath, { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setSubmitting(true);

    const result = login(username, password);

    if (result.success && result.defaultPath) {
      if (result.user?.roleKey === "STATION_MASTER" || username.trim().toUpperCase() === "SM-001") {
        setSubmitting(false);
        setShowStationModal(true);
      } else {
        navigate(result.defaultPath);
      }
    } else {
      setError(result.error || "Invalid username or password.");
      setSubmitting(false);
    }
  };

  const handleStationChosen = (stationCode: string) => {
    localStorage.setItem("krayasetu_selected_station", stationCode);
    setShowStationModal(false);
    navigate(`/station-master/${stationCode}`);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setAutofilledUser(u);
    setTimeout(() => setAutofilledUser(null), 2500);
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    const result = login(u, p);
    if (result.success && result.defaultPath) {
      if (result.user?.roleKey === "STATION_MASTER" || u.trim().toUpperCase() === "SM-001") {
        setShowStationModal(true);
      } else {
        navigate(result.defaultPath);
      }
    } else {
      setError(result.error || "Authentication failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Professional Railway Header with Official Logo */}
      <header className="bg-[#0b2545] text-white border-b border-[#134074] shadow-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={logoImg}
            alt="KrayaSetu AI Logo"
            className="h-11 w-auto max-h-11 object-contain rounded-md bg-white p-0.5 shadow-sm border border-sky-400/50 flex-shrink-0"
          />
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-white text-xl sm:text-2xl leading-none">
                KrayaSetu AI
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 bg-sky-950/80 text-sky-300 text-[10px] font-mono font-bold rounded border border-sky-700 uppercase">
                WCR · BPL
              </span>
            </div>
            <span className="text-[11px] text-sky-200/90 font-medium tracking-wide mt-0.5">
              Smart Railway Maintenance Block Planning & Operational Decision Support
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-sky-300">
          <span className="bg-sky-950 px-2.5 py-1 rounded border border-sky-800">
            Control Room Access Portal
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Credentials Form Box */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 sm:p-8">
          <div className="max-w-md mx-auto space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-sky-50 text-[#0b2545] mb-1">
                <Lock className="w-6 h-6 text-[#0b2545]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Operational Control Room Login
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Enter your assigned railway user ID to access your dedicated workspace
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800 text-xs font-medium animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {autofilledUser && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-800 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Loaded demo credentials for {autofilledUser}. Click "LOGIN" to enter.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1">
                  Username / Railway User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. COA-001, SM-001, PWAY-001"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2545] focus:border-transparent font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#0b2545] hover:bg-[#134074] text-white font-bold text-sm rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <span>{submitting ? "Authenticating..." : "LOGIN"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Demo Accounts Section specifically designed for SIH Judges */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800 font-mono">
                  Official SIH Prototype Demo Accounts
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                  Demo Passwords
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click <strong>"Fill"</strong> on any demo account below to instantly test its dedicated role workspace.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Role is auto-detected from credentials</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 pl-4">Username</th>
                  <th className="p-2.5">Railway Role</th>
                  <th className="p-2.5">Mapped Workspace</th>
                  <th className="p-2.5">Demo Password</th>
                  <th className="p-2.5">Scope & Authority</th>
                  <th className="p-2.5 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {DEMO_CREDENTIALS_LIST.map((cred) => {
                  const account = DEMO_ACCOUNTS_REGISTRY[cred.username]?.user;
                  return (
                    <tr key={cred.username} className="hover:bg-sky-50/40 transition-colors">
                      <td className="p-2.5 pl-4 font-mono font-bold text-slate-900">
                        {cred.username}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {cred.role}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${account?.badgeColor || "bg-slate-100 text-slate-800"}`}>
                          {cred.workspace}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 bg-slate-50/50">
                        <code>{cred.password}</code>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px] max-w-xs">
                        {cred.description}
                      </td>
                      <td className="p-2.5 pr-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickFill(cred.username, cred.password)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
                            title="Fill form inputs without submitting"
                          >
                            Fill
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickLogin(cred.username, cred.password)}
                            className="px-2.5 py-1 bg-[#0b2545] hover:bg-[#134074] text-white font-mono text-[11px] font-bold rounded border border-sky-900 shadow-sm transition-colors cursor-pointer flex items-center space-x-1"
                            title={`Instantly login as ${cred.username}`}
                          >
                            <span>Login</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security & SIH Notice */}
        <div className="p-3.5 bg-sky-50/80 rounded-xl border border-sky-200 text-sky-950 text-xs flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-sky-700 flex-shrink-0" />
          <span className="text-[11px] leading-relaxed">
            <strong>Demonstration Protocol:</strong> Operating in <strong>Base Infrastructure Mode (Phase 1)</strong>. Visualizes verified railway network geography, stations, platforms, tracks, signaling nodes, and traction infrastructure for Bhopal Division (West Central Railway).
          </span>
        </div>
      </main>

      {/* Station Master Station Selection Prompt Modal */}
      <StationSelectionModal
        isOpen={showStationModal}
        currentStationCode="RKMP"
        onSelectStation={handleStationChosen}
        onClose={() => setShowStationModal(false)}
        allowDismiss={true}
      />
    </div>
  );
};

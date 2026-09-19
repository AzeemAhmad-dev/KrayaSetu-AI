import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, UserCheck, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logoImg from "../../assets/logo.jpg";

interface Props {
  activeScenario?: string;
  onScenarioChange?: (scenarioId: string) => void;
}

export const Navbar: React.FC<Props> = () => {
  const { user, currentRole, logout } = useAuth();
  const [time, setTime] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-[#0b2545] text-white border-b border-[#134074] shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Top-Left Official KrayaSetu AI Branding */}
        <div className="flex items-center space-x-3">
          <Link to={currentRole.defaultPath} className="flex items-center space-x-3 group">
            <img
              src={logoImg}
              alt="KrayaSetu AI"
              className="h-11 w-auto max-h-11 object-contain rounded-md bg-white p-0.5 shadow-sm border border-sky-400/50 group-hover:scale-105 transition-transform flex-shrink-0"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-white text-xl sm:text-2xl leading-none">
                  KrayaSetu AI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-sky-950/80 text-sky-300 text-xs font-mono font-bold rounded border border-sky-700 uppercase">
                  WCR · BPL
                </span>
              </div>
              <span className="text-xs text-sky-200/90 font-medium tracking-wide mt-0.5 hidden xs:block">
                Smart Railway Block Planning
              </span>
            </div>
          </Link>
          <span className="hidden xl:inline-block px-2.5 py-1 bg-sky-950/60 text-sky-300 text-xs font-medium rounded border border-sky-800">
            Control Room Ops Support
          </span>
        </div>

        {/* Operational Stats & User Profile Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Clock */}
          <div className="flex items-center space-x-1.5 bg-[#13315c] px-2.5 py-1 rounded border border-[#1d4e89] font-mono text-xs text-slate-200">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{time} IST</span>
          </div>

          {/* User Account / Role Badge */}
          <div className="flex items-center space-x-1.5 text-xs bg-sky-900/60 text-sky-200 px-2.5 py-1 rounded border border-sky-700">
            <UserCheck className="w-3.5 h-3.5 text-sky-300 flex-shrink-0" />
            <span className="font-mono font-bold text-amber-300">{user?.username || "GUEST"}</span>
            <span className="text-slate-400 hidden sm:inline">·</span>
            <span className="max-w-[140px] truncate hidden sm:inline font-medium">
              {user?.roleTitle || currentRole.name}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-xs bg-red-950/60 hover:bg-red-900 text-red-200 px-2.5 py-1 rounded border border-red-800/80 transition-colors cursor-pointer"
            title="Logout and switch account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

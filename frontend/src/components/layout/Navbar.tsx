import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, UserCheck, LogOut, AlertTriangle, ShieldCheck, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";
import {
  ModalDrawer,
  ModalDrawerContent,
  ModalDrawerHeader,
  ModalDrawerTitle,
  ModalDrawerDescription,
  ModalDrawerBody,
  ModalDrawerFooter,
} from "../ui/ModalDrawer";
import logoImg from "../../assets/logo.jpg";

interface Props {
  activeScenario?: string;
  onScenarioChange?: (scenarioId: string) => void;
}

export const Navbar: React.FC<Props> = () => {
  const { user, currentRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState<string>("");
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState<boolean>(false);
  const navigate = useNavigate();

  // IST Clock with instant visibilitychange / focus resync on tab resume
  const updateTime = useCallback(() => {
    const now = new Date();
    setTime(
      now.toLocaleTimeString("en-IN", {
        hour12: false,
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, []);

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateTime();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", updateTime);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", updateTime);
    };
  }, [updateTime]);

  // Check if any defect or issue form currently has unsubmitted / dirty text input
  const checkHasUnsavedDefectInput = (): boolean => {
    // 1. Check all textareas
    const textareas = document.querySelectorAll("textarea");
    for (const ta of textareas) {
      if (ta.value && ta.value.trim().length > 0) {
        return true;
      }
    }

    // 2. Check text inputs for defect/issue/observation keywords
    const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
    for (const inp of textInputs as NodeListOf<HTMLInputElement>) {
      const ph = (inp.placeholder || "").toLowerCase();
      const name = (inp.name || "").toLowerCase();
      const id = (inp.id || "").toLowerCase();
      const isDefectInput =
        ph.includes("defect") ||
        ph.includes("issue") ||
        ph.includes("broken") ||
        ph.includes("observation") ||
        ph.includes("anomaly") ||
        ph.includes("summary") ||
        ph.includes("weld") ||
        name.includes("defect") ||
        name.includes("title") ||
        id.includes("defect");

      if (isDefectInput && inp.value && inp.value.trim().length > 0) {
        return true;
      }
    }
    return false;
  };

  const handleLogoutClick = () => {
    if (checkHasUnsavedDefectInput()) {
      setShowDiscardConfirmModal(true);
    } else {
      performLogout();
    }
  };

  const performLogout = () => {
    setShowDiscardConfirmModal(false);
    logout();
    navigate("/login");
  };

  const roleDisplayTitle = user?.roleTitle || currentRole.name;
  const fullRoleDepartment = user?.department || currentRole.department;
  const fullTooltip = `${user?.username || "GUEST"} · ${roleDisplayTitle}${fullRoleDepartment ? ` (${fullRoleDepartment})` : ""}`;

  return (
    <>
      <header className="bg-[var(--brand-navy)] text-[var(--text-inverse)] border-b border-[var(--brand-navy-border)] shadow-md sticky top-0 z-[60] select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Top-Left Official KrayaSetu AI Branding */}
          <div className="flex items-center space-x-3">
            <Link to={currentRole.defaultPath} className="flex items-center space-x-3 group">
              <img
                src={logoImg}
                alt="KrayaSetu AI"
                className="h-11 w-auto max-h-11 object-contain rounded-[var(--radius-md)] bg-white p-0.5 shadow-sm border border-sky-400/50 group-hover:scale-105 transition-transform flex-shrink-0"
              />
              <div className="flex flex-col justify-center">
                <div className="flex items-center space-x-2">
                  <span className="font-black tracking-tight text-[var(--text-inverse)] text-xl sm:text-2xl leading-none font-sans">
                    KrayaSetu AI
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 bg-[var(--brand-navy-hover)] text-sky-300 text-xs font-mono font-bold rounded-[var(--radius-xs)] border border-sky-700/60 uppercase">
                    WCR · BPL
                  </span>
                </div>
                <span className="text-xs text-sky-200/90 font-medium tracking-wide mt-0.5 hidden xs:block">
                  Smart Railway Block Planning
                </span>
              </div>
            </Link>

            <span className="hidden xl:inline-block px-2.5 py-1 bg-[var(--brand-navy-hover)]/70 text-sky-300 text-xs font-mono font-medium rounded-[var(--radius-sm)] border border-sky-800/80">
              Control Room Ops Support
            </span>
          </div>

          {/* Operational Stats & User Profile Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Resynchronizing IST Live Clock */}
            <div
              className="flex items-center space-x-1.5 bg-[var(--brand-navy-hover)] px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--brand-canvas-blue)]/60 font-mono text-xs text-slate-200 shadow-2xs"
              title="Indian Standard Time (IST) — Auto-resynchronizes on browser tab wakeup"
            >
              <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span className="font-semibold tracking-wider">{time || "--:--:--"} IST</span>
            </div>

            {/* User Account / Role Badge with Defined Truncate-With-Tooltip Rule */}
            <div
              className="flex items-center space-x-1.5 text-xs bg-[var(--brand-navy-hover)]/90 text-sky-200 px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--brand-canvas-blue)]/50 cursor-help"
              title={fullTooltip}
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-300 flex-shrink-0" />
              <span className="font-mono font-bold text-amber-300 flex-shrink-0">
                {user?.username || "GUEST"}
              </span>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span
                className="max-w-[110px] sm:max-w-[150px] md:max-w-[200px] lg:max-w-[240px] truncate hidden sm:inline font-medium"
                title={fullTooltip}
              >
                {roleDisplayTitle}
              </span>
            </div>
            
            {/* Single Global Theme Toggle */}
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
              leftIcon={
                theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-sky-200" />
                )
              }
              className="px-2.5 py-1 text-xs bg-[var(--brand-navy-hover)] text-sky-100 hover:text-white border-[var(--brand-canvas-blue)]/60"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              <span className="hidden md:inline">
                {theme === "dark" ? "Light" : "Dark"}
              </span>
            </Button>

            {/* Logout Button (Phase 1 Button Primitive) */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogoutClick}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="px-2.5 py-1 text-xs"
              title="Logout and switch account"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Discard Confirmation Modal for Unsaved Defect Reports */}
      <ModalDrawer
        open={showDiscardConfirmModal}
        onOpenChange={setShowDiscardConfirmModal}
        presentation="modal"
      >
        <ModalDrawerContent className="max-w-md">
          <ModalDrawerHeader>
            <div className="flex items-center space-x-2 text-[var(--status-danger)]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <ModalDrawerTitle className="text-base sm:text-lg">
                Discard Unsaved Defect Report?
              </ModalDrawerTitle>
            </div>
            <ModalDrawerDescription>
              You have unsubmitted defect or infrastructure issue details entered into a form. Logging out now will discard these changes permanently.
            </ModalDrawerDescription>
          </ModalDrawerHeader>
          <ModalDrawerBody>
            <p className="text-xs text-[var(--text-muted)] font-mono bg-[var(--surface-secondary)] p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] leading-relaxed">
              Statutory Safety Protocol: Infrastructure defects must be recorded directly to the central database before relinquishing active duty.
            </p>
          </ModalDrawerBody>
          <ModalDrawerFooter>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setShowDiscardConfirmModal(false)}
            >
              Cancel & Keep Editing
            </Button>
            <Button
              variant="destructive"
              size="default"
              onClick={performLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Discard & Log Out
            </Button>
          </ModalDrawerFooter>
        </ModalDrawerContent>
      </ModalDrawer>
    </>
  );
};

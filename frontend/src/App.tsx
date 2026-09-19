import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { LoginPage } from "./pages/LoginPage";
import { ControlDashboard } from "./pages/ControlDashboard";
import { CorridorsPage } from "./pages/CorridorsPage";
import { CorridorDetailPage } from "./pages/CorridorDetailPage";
import { StationMasterPage } from "./pages/StationMasterPage";
import { BlockPlannerPage } from "./pages/BlockPlannerPage";
import { CoordinationPage } from "./pages/CoordinationPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { ScenarioAnalysisPage } from "./pages/ScenarioAnalysisPage";
import { EventsHistoryPage } from "./pages/EventsHistoryPage";
import { ElectricalTRDControl } from "./pages/ElectricalTRDControl";
import { EngineeringPWayControl } from "./pages/EngineeringPWayControl";
import { SignalSNTControl } from "./pages/SignalSNTControl";
import { DivisionalOperationsControl } from "./pages/DivisionalOperationsControl";
import { TrainPilotWorkspacePage } from "./pages/TrainPilotWorkspacePage";

const ProtectedRoute: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
  const { isAuthenticated, canAccessPath, currentRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessPath(path)) {
    return <Navigate to={currentRole.defaultPath} replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, currentRole } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={currentRole.defaultPath} replace />;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {!isLoginPage && <Navbar />}
      <div className="flex flex-1">
        {!isLoginPage && isAuthenticated && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Master / Central Control Workspace (COA-001) */}
            <Route
              path="/control"
              element={
                <ProtectedRoute path="/control">
                  <ControlDashboard />
                </ProtectedRoute>
              }
            />

            {/* Corridor Control Workspace (COR-001) */}
            <Route
              path="/corridors"
              element={
                <ProtectedRoute path="/corridors">
                  <CorridorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/corridors/:corridorId"
              element={
                <ProtectedRoute path="/corridors">
                  <CorridorDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/corridors/:corridorId/block"
              element={
                <ProtectedRoute path="/corridors">
                  <CorridorDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Station Master Workspace (SM-001) */}
            <Route
              path="/station-master"
              element={<Navigate to={`/station-master/${localStorage.getItem("krayasetu_selected_station") || "RKMP"}`} replace />}
            />
            <Route
              path="/station-master/:stationCode"
              element={
                <ProtectedRoute path="/station-master">
                  <StationMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/station-master/:stationCode/block"
              element={
                <ProtectedRoute path="/station-master">
                  <StationMasterPage />
                </ProtectedRoute>
              }
            />

            {/* Track / P.Way Maintenance Workspace (PWAY-001, PWAY-002) */}
            <Route
              path="/pway-control"
              element={
                <ProtectedRoute path="/pway-control">
                  <EngineeringPWayControl />
                </ProtectedRoute>
              }
            />

            {/* Signal & S&T Control Workspace (SNT-001) */}
            <Route
              path="/snt-control"
              element={
                <ProtectedRoute path="/snt-control">
                  <SignalSNTControl />
                </ProtectedRoute>
              }
            />

            {/* Traction / OHE Control Workspace (TRD-001, TRD-002) */}
            <Route
              path="/trd-control"
              element={
                <ProtectedRoute path="/trd-control">
                  <ElectricalTRDControl />
                </ProtectedRoute>
              }
            />

            {/* Train Pilot Activity Logging Workspace (TRAIN-001) */}
            <Route
              path="/train-pilot"
              element={
                <ProtectedRoute path="/train-pilot">
                  <TrainPilotWorkspacePage />
                </ProtectedRoute>
              }
            />

            {/* Divisional Operations Executive Control */}
            <Route
              path="/operations-control"
              element={
                <ProtectedRoute path="/operations-control">
                  <DivisionalOperationsControl />
                </ProtectedRoute>
              }
            />

            {/* Block Planner (CP-SAT Constraint Engine) */}
            <Route
              path="/block-planner"
              element={
                <ProtectedRoute path="/block-planner">
                  <BlockPlannerPage />
                </ProtectedRoute>
              }
            />

            {/* Inter-Department Coordination */}
            <Route
              path="/coordination"
              element={
                <ProtectedRoute path="/coordination">
                  <CoordinationPage />
                </ProtectedRoute>
              }
            />

            {/* Maintenance & Faults */}
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute path="/maintenance">
                  <MaintenancePage />
                </ProtectedRoute>
              }
            />

            {/* Simulation & Disruption Analysis Lab */}
            <Route
              path="/scenario-analysis"
              element={
                <ProtectedRoute path="/scenario-analysis">
                  <ScenarioAnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scenario-lab"
              element={<Navigate to="/scenario-analysis" replace />}
            />

            {/* Events Audit Log */}
            <Route
              path="/events"
              element={
                <ProtectedRoute path="/events">
                  <EventsHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

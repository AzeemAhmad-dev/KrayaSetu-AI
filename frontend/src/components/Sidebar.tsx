import React from 'react';
import { LayoutDashboard, Calendar, ClipboardList, Users, Beaker, Map } from 'lucide-react';
import clsx from 'clsx';

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  const menuItems = [
    { id: 'operations', label: 'Operations', icon: LayoutDashboard },
    { id: 'weekly', label: 'Weekly / Monthly', icon: Calendar },
    { id: 'block', label: 'Block Planner', icon: ClipboardList },
    { id: 'coordination', label: 'Coordination', icon: Users },
    { id: 'scenario', label: 'Scenario Analysis', icon: Beaker },
    { id: 'pan_india', label: 'PAN INDIA', icon: Map },
  ];

  return (
    <aside className="w-64 bg-white border-r border-line flex flex-col h-screen fixed top-0 left-0">
      <div className="p-5 border-b border-line flex items-center gap-3">
        {/* Placeholder for Logo */}
        <div className="w-8 h-8 bg-rail-blue-2 rounded-md flex items-center justify-center text-white font-bold text-xl">
          🚆
        </div>
        <h2 className="text-xl font-bold text-rail-blue m-0">KrayaSetu AI</h2>
      </div>
      
      <nav className="flex-1 py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                isActive 
                  ? "bg-blue-50 text-rail-blue-2 font-bold" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} className={isActive ? "text-rail-blue-2" : "text-gray-400"} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Network, AlertTriangle,
  Cpu, MessageSquare, Settings, Radio, Wifi, User,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/mesh', icon: Network, label: 'Mesh Network' },
  { to: '/alerts', icon: AlertTriangle, label: 'Emergency Alerts' },
  { to: '/devices', icon: Cpu, label: 'Devices' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-[10px] bg-active flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-txt">LoraNet</div>
            <div className="text-[10px] font-semibold text-txt-secondary uppercase tracking-widest">Mesh Network</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-4 py-4 border-t border-border flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-success pulse-dot" />
            <span className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wide">Network Active</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Wifi className="w-3.5 h-3.5 text-success" />
            <span className="text-[11px] font-medium text-txt-secondary">Gateway Connected</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1 pt-3 border-t border-border">
            <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-txt-secondary" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-txt">Coordinator</div>
              <div className="text-[10px] text-txt-secondary">Admin</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

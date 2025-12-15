'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Trophy,
  Users,
  CheckSquare,
  BarChart3,
  Settings,
  FileText,
  Shield,
} from 'lucide-react';
import { RoleSwitcher } from './role-switcher';
import { useRole } from '@/contexts/role-context';
import { can } from '@/lib/rbac/permissions';

export function Sidebar() {
  const pathname = usePathname();
  const { activeRole } = useRole();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: 'Leagues',
      href: '/leagues',
      icon: Trophy,
      show: true,
    },
    {
      name: 'My Team',
      href: '/team',
      icon: Users,
      show: true,
    },
    {
      name: 'Submissions',
      href: '/submissions',
      icon: CheckSquare,
      show: true,
    },
    {
      name: 'Leaderboards',
      href: '/leaderboards',
      icon: BarChart3,
      show: true,
    },
    {
      name: 'Validation Queue',
      href: '/submissions/validate',
      icon: Shield,
      show: activeRole ? can(activeRole, 'validateTeamSubmissions') : false,
    },
    {
      name: 'League Settings',
      href: '/leagues/settings',
      icon: Settings,
      show: activeRole ? can(activeRole, 'editLeagueSettings') : false,
    },
    {
      name: 'Rules',
      href: '/rules',
      icon: FileText,
      show: true,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-[#0B365F]">MFL</h2>
      </div>

      {/* Role Switcher */}
      <div className="p-4 border-b border-gray-200">
        <RoleSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation
          .filter((item) => item.show)
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#0B365F] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          © 2025 My Fitness League
        </div>
      </div>
    </aside>
  );
}


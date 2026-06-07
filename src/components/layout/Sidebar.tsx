'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  BarChart3,
  Settings,
  MessageSquare,
  Calendar,
  X,
  Bell,
} from 'lucide-react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const { user } = useAuth();

  const navigation = [
    {
      name: t('dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'supervisor', 'representative', 'client'],
    },
    {
      name: t('visits'),
      href: '/dashboard/visits',
      icon: ClipboardList,
      roles: ['admin', 'supervisor', 'representative', 'client'],
    },
    {
      name: t('branches'),
      href: '/dashboard/branches',
      icon: Building2,
      roles: ['admin', 'supervisor', 'client'],
    },
    {
      name: lang === 'ar' ? 'التعيينات اليومية' : 'Daily Assignments',
      href: '/dashboard/assignments',
      icon: Calendar,
      roles: ['admin', 'supervisor', 'representative'],
    },
    {
      name: t('users'),
      href: '/dashboard/users',
      icon: Users,
      roles: ['admin'],
    },
    {
      name: t('reports'),
      href: '/dashboard/reports',
      icon: BarChart3,
      roles: ['admin', 'supervisor', 'client'],
    },
    {
      name: lang === 'ar' ? 'الإشعارات' : 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
      roles: ['admin', 'supervisor', 'representative', 'client'],
    },
    {
      name: t('aiChat'),
      href: '/dashboard/ai-chat',
      icon: MessageSquare,
      roles: ['admin', 'supervisor'],
    },
    {
      name: t('settings'),
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const filteredNav = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 w-64 bg-white dark:bg-gray-800 border-e border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full rtl:lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white block text-sm">
                {t('appName')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'ar' ? 'v1.0' : 'v1.0'}
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  {(user.nameAr || user.name).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {lang === 'ar' && user.nameAr ? user.nameAr : user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-10rem)]">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/50'
                )}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 start-0 end-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            © 2024 {t('appName')}
          </p>
        </div>
      </aside>
    </>
  );
}

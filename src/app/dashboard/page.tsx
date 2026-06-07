'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Building2,
  AlertTriangle,
  Users,
  Clock,
  Play,
  CheckCircle,
  MapPin,
  Eye,
  BarChart3,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatTime } from '@/lib/utils';
import { getTodayDateString } from '@/lib/date-utils';

interface DashboardData {
  role: string;
  stats: {
    todayVisits?: number;
    completedToday?: number;
    totalBranches?: number;
    coveredBranches?: number;
    activeReps?: number;
    todayShortages?: number;
    todayAssignments?: number;
    completedVisits?: number;
    pendingVisits?: number;
    shortages?: number;
  };
  recentVisits?: Array<{
    id: number;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    branchName: string | null;
    branchNameAr: string | null;
    representativeName: string | null;
  }>;
  assignments?: Array<{
    id: number;
    branchId: number;
    branchName: string | null;
    branchNameAr: string | null;
    branchAddress: string | null;
  }>;
  visits?: Array<{
    id: number;
    branchId: number;
    status: string;
  }>;
  branches?: Array<{
    id: number;
    name: string;
    nameAr: string | null;
  }>;
  weeklyData?: Array<{
    date: string;
    total: number;
    completed: number;
  }>;
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  // Representative Dashboard
  if (user?.role === 'representative') {
    return (
      <DashboardLayout>
        <RepresentativeDashboard data={data} lang={lang} />
      </DashboardLayout>
    );
  }

  // Client Dashboard
  if (user?.role === 'client') {
    return (
      <DashboardLayout>
        <ClientDashboard data={data} lang={lang} />
      </DashboardLayout>
    );
  }

  // Admin/Supervisor Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {lang === 'ar' ? 'نظرة عامة على النظام' : 'System Overview'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('todayVisits')}
            value={data?.stats.todayVisits || 0}
            icon={<ClipboardCheck size={24} />}
            color="blue"
          />
          <StatCard
            title={t('coveredBranches')}
            value={`${data?.stats.coveredBranches || 0} / ${data?.stats.totalBranches || 0}`}
            icon={<Building2 size={24} />}
            color="green"
          />
          <StatCard
            title={t('totalShortages')}
            value={data?.stats.todayShortages || 0}
            icon={<AlertTriangle size={24} />}
            color="yellow"
          />
          <StatCard
            title={t('activeReps')}
            value={data?.stats.activeReps || 0}
            icon={<Users size={24} />}
            color="purple"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Chart */}
          <Card>
            <CardHeader
              title={t('weeklyOverview')}
              titleAr="نظرة أسبوعية"
              lang={lang}
            />
            <div className="h-64 flex items-end gap-2 pt-4">
              {data?.weeklyData?.map((day, index) => {
                const maxValue = Math.max(...(data?.weeklyData?.map(d => d.total) || [1]));
                const height = maxValue > 0 ? (day.total / maxValue) * 100 : 5;
                const completedHeight = day.total > 0 ? (day.completed / day.total) * height : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end h-48">
                      <div
                        className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-lg relative"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg"
                          style={{ height: `${completedHeight}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(day.date + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                        weekday: 'short',
                      })}
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {day.total}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 rounded" />
                <span className="text-gray-500">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-gray-500">{lang === 'ar' ? 'مكتملة' : 'Completed'}</span>
              </div>
            </div>
          </Card>

          {/* Recent Visits */}
          <Card>
            <CardHeader
              title={t('recentVisits')}
              titleAr="أحدث الزيارات"
              lang={lang}
            />
            <div className="space-y-3">
              {data?.recentVisits?.slice(0, 5).map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {lang === 'ar' && visit.branchNameAr ? visit.branchNameAr : visit.branchName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={14} />
                        {visit.checkInTime ? formatTime(visit.checkInTime, lang === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={visit.status} lang={lang} />
                </div>
              ))}
              {(!data?.recentVisits || data.recentVisits.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {lang === 'ar' ? 'لا توجد زيارات حديثة' : 'No recent visits'}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Representative Dashboard Component
function RepresentativeDashboard({ data, lang }: { data: DashboardData | null; lang: 'en' | 'ar' }) {
  const todayStr = getTodayDateString();
  
  // Get visits for assignments to determine status
  const getAssignmentStatus = (branchId: number) => {
    const visit = data?.visits?.find(v => v.branchId === branchId);
    return visit?.status || 'pending';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {lang === 'ar' ? 'مرحباً بك' : 'Welcome'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {lang === 'ar' ? 'هذه هي مهامك لليوم' : "Here are your tasks for today"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={lang === 'ar' ? 'تعيينات اليوم' : "Today's Assignments"}
          value={data?.stats.todayAssignments || 0}
          icon={<ClipboardCheck size={24} />}
          color="blue"
        />
        <StatCard
          title={lang === 'ar' ? 'مكتملة' : 'Completed'}
          value={data?.stats.completedVisits || 0}
          icon={<CheckCircle size={24} />}
          color="green"
        />
        <StatCard
          title={lang === 'ar' ? 'متبقية' : 'Pending'}
          value={data?.stats.pendingVisits || 0}
          icon={<Clock size={24} />}
          color="yellow"
        />
      </div>

      {/* Assignments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {lang === 'ar' ? 'الفروع المخصصة لك اليوم' : "Today's Assigned Branches"}
        </h2>
        
        {data?.assignments && data.assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.assignments.map((assignment) => {
              const status = getAssignmentStatus(assignment.branchId);
              return (
                <Card key={assignment.id} className="card-hover">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <StatusBadge status={status} lang={lang} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {lang === 'ar' && assignment.branchNameAr ? assignment.branchNameAr : assignment.branchName}
                  </h3>
                  {assignment.branchAddress && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 flex items-start gap-1">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                      {assignment.branchAddress}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {status === 'pending' && (
                      <Link href="/dashboard/assignments">
                        <Button className="w-full" icon={<Play size={18} />}>
                          {lang === 'ar' ? 'بدء الزيارة' : 'Start Visit'}
                        </Button>
                      </Link>
                    )}
                    {status === 'in_progress' && (
                      <Link href="/dashboard/visits">
                        <Button variant="secondary" className="w-full" icon={<Eye size={18} />}>
                          {lang === 'ar' ? 'عرض الزيارة الجارية' : 'View Active Visit'}
                        </Button>
                      </Link>
                    )}
                    {status === 'completed' && (
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle size={18} />
                        {lang === 'ar' ? 'تمت الزيارة' : 'Visit Completed'}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-8">
              <ClipboardCheck size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {lang === 'ar' ? 'لا توجد فروع مخصصة لك اليوم' : 'No branches assigned for today'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Client Dashboard Component
function ClientDashboard({ data, lang }: { data: DashboardData | null; lang: 'en' | 'ar' }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {lang === 'ar' ? 'نظرة عامة على فروعك' : 'Overview of your branches'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={lang === 'ar' ? 'إجمالي الفروع' : 'Total Branches'}
          value={data?.stats.totalBranches || 0}
          icon={<Building2 size={24} />}
          color="blue"
        />
        <StatCard
          title={lang === 'ar' ? 'زيارات اليوم' : "Today's Visits"}
          value={data?.stats.todayVisits || 0}
          icon={<ClipboardCheck size={24} />}
          color="green"
        />
        <StatCard
          title={lang === 'ar' ? 'مكتملة' : 'Completed'}
          value={data?.stats.completedVisits || 0}
          icon={<CheckCircle size={24} />}
          color="purple"
        />
        <StatCard
          title={lang === 'ar' ? 'النواقص' : 'Shortages'}
          value={data?.stats.shortages || 0}
          icon={<AlertTriangle size={24} />}
          color="yellow"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/branches">
          <Card className="card-hover cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'ar' ? 'فروعي' : 'My Branches'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'ar' ? 'عرض وإدارة الفروع المسجلة' : 'View and manage registered branches'}
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/visits">
          <Card className="card-hover cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <ClipboardCheck size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'ar' ? 'تقارير الزيارات' : 'Visit Reports'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'ar' ? 'عرض تقارير زيارات الفروع' : 'View branch visit reports'}
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/reports">
          <Card className="card-hover cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <BarChart3 size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {lang === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'ar' ? 'تقارير مفصلة وإحصائيات' : 'Detailed reports and statistics'}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Branches List */}
      {data?.branches && data.branches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {lang === 'ar' ? 'فروعك' : 'Your Branches'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.branches.slice(0, 6).map((branch) => (
              <Card key={branch.id}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lang === 'ar' && branch.nameAr ? branch.nameAr : branch.name}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

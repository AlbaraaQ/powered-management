'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, Building2, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { formatDateTime } from '@/lib/utils';

interface VisitReportType {
  id: number;
  branchName: string | null;
  branchNameAr: string | null;
  representativeName: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
}

export default function ReportsPage() {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<VisitReportType[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
  });
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/visits?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits);

        // Calculate stats
        const total = data.visits.length;
        const completed = data.visits.filter((v: VisitReportType) => v.status === 'completed').length;
        const pending = data.visits.filter((v: VisitReportType) => v.status === 'pending').length;
        const inProgress = data.visits.filter((v: VisitReportType) => v.status === 'in_progress').length;

        setStats({ total, completed, pending, inProgress });
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Branch', 'Representative', 'Check In', 'Check Out', 'Status'];
    const rows = visits.map((v) => [
      v.id,
      v.branchName || '',
      v.representativeName || '',
      v.checkInTime || '',
      v.checkOutTime || '',
      v.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visits-report-${startDate}-${endDate}.csv`;
    a.click();
  };

  const statusOptions = [
    { value: '', label: lang === 'ar' ? 'جميع الحالات' : 'All Statuses' },
    { value: 'completed', label: lang === 'ar' ? 'مكتملة' : 'Completed' },
    { value: 'pending', label: lang === 'ar' ? 'معلقة' : 'Pending' },
    { value: 'in_progress', label: lang === 'ar' ? 'جارية' : 'In Progress' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('reports')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? 'تقارير الزيارات والتحليلات' : 'Visit reports and analytics'}
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline" icon={<Download size={20} />}>
            {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={lang === 'ar' ? 'من تاريخ' : 'From Date'}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              icon={<Calendar size={18} />}
            />
            <Input
              label={lang === 'ar' ? 'إلى تاريخ' : 'To Date'}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              icon={<Calendar size={18} />}
            />
            <Select
              label={t('status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={lang === 'ar' ? 'إجمالي الزيارات' : 'Total Visits'}
            value={stats.total}
            icon={<BarChart3 size={24} />}
            color="blue"
          />
          <StatCard
            title={lang === 'ar' ? 'مكتملة' : 'Completed'}
            value={stats.completed}
            icon={<CheckCircle size={24} />}
            color="green"
          />
          <StatCard
            title={lang === 'ar' ? 'جارية' : 'In Progress'}
            value={stats.inProgress}
            icon={<Clock size={24} />}
            color="yellow"
          />
          <StatCard
            title={lang === 'ar' ? 'معلقة' : 'Pending'}
            value={stats.pending}
            icon={<AlertTriangle size={24} />}
            color="red"
          />
        </div>

        {/* Completion Rate */}
        <Card>
          <CardHeader
            title={lang === 'ar' ? 'معدل الإنجاز' : 'Completion Rate'}
            lang={lang}
          />
          <div className="relative pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{lang === 'ar' ? 'مكتملة' : 'Completed'}</span>
              <span className="text-sm font-medium">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'تفاصيل الزيارات' : 'Visit Details'}
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loading />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {lang === 'ar' ? 'لا توجد زيارات في هذه الفترة' : 'No visits in this period'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('branches')}</TableHead>
                  <TableHead className="hidden md:table-cell">{lang === 'ar' ? 'المندوب' : 'Representative'}</TableHead>
                  <TableHead>{lang === 'ar' ? 'الحضور' : 'Check In'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{lang === 'ar' ? 'الانصراف' : 'Check Out'}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">#{visit.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        {lang === 'ar' && visit.branchNameAr ? visit.branchNameAr : visit.branchName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        {visit.representativeName || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {visit.checkInTime ? formatDateTime(visit.checkInTime, lang === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {visit.checkOutTime ? formatDateTime(visit.checkOutTime, lang === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={visit.status} lang={lang} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

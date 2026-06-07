'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Building2, User, CheckCircle, Play, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTodayDateString, getDateOffsetString } from '@/lib/date-utils';

interface AssignmentType {
  id: number;
  representativeId: number;
  branchId: number;
  assignmentDate: string;
  notes: string | null;
  branchName: string | null;
  branchNameAr: string | null;
  branchAddress: string | null;
  branchLat: string | null;
  branchLng: string | null;
  representativeName: string | null;
  visitStatus: string;
  visitId: number | null;
}

interface BranchType {
  id: number;
  name: string;
  nameAr: string | null;
}

interface RepType {
  id: number;
  name: string;
  nameAr: string | null;
}

export default function AssignmentsPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [modalOpen, setModalOpen] = useState(false);
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [representatives, setRepresentatives] = useState<RepType[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Start visit state
  const [startingVisit, setStartingVisit] = useState<number | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [startVisitModal, setStartVisitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentType | null>(null);

  const [formData, setFormData] = useState({
    representativeId: '',
    branchId: '',
    assignmentDate: selectedDate,
    notes: '',
  });

  const canManage = user?.role === 'admin' || user?.role === 'supervisor';
  const isRep = user?.role === 'representative';

  useEffect(() => {
    fetchAssignments();
    if (canManage) {
      fetchBranches();
      fetchRepresentatives();
    }
  }, [selectedDate]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches?active=true');
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchRepresentatives = async () => {
    try {
      const res = await fetch('/api/users?role=representative&active=true');
      if (res.ok) {
        const data = await res.json();
        setRepresentatives(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch representatives:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.representativeId || !formData.branchId) return;
    setSaving(true);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representativeId: parseInt(formData.representativeId),
          branchId: parseInt(formData.branchId),
          assignmentDate: formData.assignmentDate,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setFormData({
          representativeId: '',
          branchId: '',
          assignmentDate: selectedDate,
          notes: '',
        });
        fetchAssignments();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setSaving(false);
    }
  };

  const openStartVisitModal = (assignment: AssignmentType) => {
    setSelectedAssignment(assignment);
    setVisitNotes('');
    setStartVisitModal(true);
  };

  const startVisit = async () => {
    if (!selectedAssignment) return;
    setStartingVisit(selectedAssignment.id);

    try {
      if (!navigator.geolocation) {
        throw new Error(lang === 'ar' ? 'المتصفح لا يدعم الموقع الجغرافي' : 'Geolocation is not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        });
      });

      const lat = position.coords.latitude.toString();
      const lng = position.coords.longitude.toString();

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedAssignment.branchId,
          assignmentId: selectedAssignment.id,
          checkInLat: lat,
          checkInLng: lng,
          notes: visitNotes,
        }),
      });

      if (res.ok) {
        setStartVisitModal(false);
        setSelectedAssignment(null);
        fetchAssignments();
        // Redirect to visits page
        window.location.href = '/dashboard/visits';
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'ar' ? 'فشل في بدء الزيارة' : 'Failed to start visit'));
      }
    } catch (error) {
      console.error('Failed to start visit:', error);
      alert(lang === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setStartingVisit(null);
    }
  };

  const changeDate = (days: number) => {
    const newDate = getDateOffsetString(
      Math.round((new Date(selectedDate).getTime() - new Date(getTodayDateString()).getTime()) / (1000 * 60 * 60 * 24)) + days
    );
    setSelectedDate(newDate);
  };

  const isDateToday = selectedDate === getTodayDateString();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'التعيينات اليومية' : 'Daily Assignments'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isRep 
                ? (lang === 'ar' ? 'الفروع المخصصة لك' : 'Your assigned branches')
                : (lang === 'ar' ? 'تعيين الفروع للمندوبين' : 'Assign branches to representatives')}
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setModalOpen(true)} icon={<Plus size={20} />}>
              {lang === 'ar' ? 'تعيين جديد' : 'New Assignment'}
            </Button>
          )}
        </div>

        {/* Date Selector */}
        <Card>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-xl"
            >
              {lang === 'ar' ? '→' : '←'}
            </button>
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-lg font-medium text-gray-900 dark:text-white focus:outline-none cursor-pointer"
              />
              {isDateToday && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                  {lang === 'ar' ? 'اليوم' : 'Today'}
                </span>
              )}
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-xl"
            >
              {lang === 'ar' ? '←' : '→'}
            </button>
          </div>
        </Card>

        {/* Assignments Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        ) : assignments.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                {lang === 'ar' ? 'لا توجد تعيينات' : 'No assignments'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {isRep
                  ? (lang === 'ar' ? 'لم يتم تعيين أي فروع لك في هذا اليوم' : 'No branches assigned to you for this day')
                  : (lang === 'ar' ? 'لم يتم تعيين أي فروع لهذا اليوم' : 'No branches assigned for this day')}
              </p>
              {canManage && (
                <Button onClick={() => setModalOpen(true)} icon={<Plus size={20} />}>
                  {lang === 'ar' ? 'إضافة تعيين' : 'Add Assignment'}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <StatusBadge status={assignment.visitStatus} lang={lang} />
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {lang === 'ar' && assignment.branchNameAr ? assignment.branchNameAr : assignment.branchName}
                </h3>

                {assignment.branchAddress && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 flex items-start gap-1">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    {assignment.branchAddress}
                  </p>
                )}

                {!isRep && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <User size={16} className="text-gray-400" />
                    {assignment.representativeName}
                  </div>
                )}

                {/* Actions based on status */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {assignment.visitStatus === 'pending' && isDateToday && isRep && (
                    <Button 
                      className="w-full" 
                      onClick={() => openStartVisitModal(assignment)}
                      icon={<Play size={18} />}
                    >
                      {lang === 'ar' ? 'بدء الزيارة' : 'Start Visit'}
                    </Button>
                  )}

                  {assignment.visitStatus === 'in_progress' && (
                    <a
                      href="/dashboard/visits"
                      className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                    >
                      <Clock size={16} />
                      {lang === 'ar' ? 'زيارة جارية - عرض' : 'Visit in Progress - View'}
                    </a>
                  )}

                  {assignment.visitStatus === 'completed' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle size={18} />
                      {lang === 'ar' ? 'تمت الزيارة بنجاح' : 'Visit Completed'}
                    </div>
                  )}

                  {assignment.visitStatus === 'pending' && !isDateToday && (
                    <p className="text-center text-sm text-gray-500">
                      {lang === 'ar' ? 'يمكن بدء الزيارة في يوم التعيين فقط' : 'Can only start visit on assignment day'}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Assignment Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={lang === 'ar' ? 'تعيين جديد' : 'New Assignment'}
        >
          <div className="space-y-4">
            <Select
              label={lang === 'ar' ? 'المندوب' : 'Representative'}
              value={formData.representativeId}
              onChange={(e) => setFormData({ ...formData, representativeId: e.target.value })}
              options={[
                { value: '', label: lang === 'ar' ? 'اختر مندوب' : 'Select Representative' },
                ...representatives.map((r) => ({
                  value: r.id.toString(),
                  label: lang === 'ar' && r.nameAr ? r.nameAr : r.name,
                })),
              ]}
            />
            <Select
              label={t('branches')}
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              options={[
                { value: '', label: lang === 'ar' ? 'اختر فرع' : 'Select Branch' },
                ...branches.map((b) => ({
                  value: b.id.toString(),
                  label: lang === 'ar' && b.nameAr ? b.nameAr : b.name,
                })),
              ]}
            />
            <Input
              label={t('date')}
              type="date"
              value={formData.assignmentDate}
              onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
            />
            <Input
              label={t('notes')}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={lang === 'ar' ? 'ملاحظات اختيارية' : 'Optional notes'}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t('save')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Start Visit Modal */}
        <Modal
          isOpen={startVisitModal}
          onClose={() => setStartVisitModal(false)}
          title={lang === 'ar' ? 'بدء الزيارة' : 'Start Visit'}
        >
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 size={24} className="text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {lang === 'ar' && selectedAssignment.branchNameAr 
                        ? selectedAssignment.branchNameAr 
                        : selectedAssignment.branchName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedAssignment.branchAddress}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <span>
                  {lang === 'ar' 
                    ? 'سيتم تسجيل موقعك الحالي ووقت بدء الزيارة'
                    : 'Your current location and check-in time will be recorded'}
                </span>
              </div>

              <Textarea
                label={lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={3}
                placeholder={lang === 'ar' ? 'أي ملاحظات قبل بدء الزيارة...' : 'Any notes before starting...'}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setStartVisitModal(false)}>
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={startVisit} 
                  loading={startingVisit === selectedAssignment.id}
                  icon={<Play size={18} />}
                >
                  {lang === 'ar' ? 'بدء الزيارة الآن' : 'Start Visit Now'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}

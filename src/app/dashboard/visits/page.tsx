'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Clock,
  Building2,
  User,
  Camera,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDateTime, formatTime } from '@/lib/utils';

interface VisitType {
  id: number;
  representativeId: number;
  branchId: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLat: string | null;
  checkInLng: string | null;
  checkOutLat?: string | null;
  checkOutLng?: string | null;
  status: string;
  notes: string | null;
  branchName: string | null;
  branchNameAr: string | null;
  representativeName: string | null;
  createdAt: string;
}

interface VisitDetailType extends VisitType {
  branchAddress: string | null;
}

interface PhotoType {
  id: number;
  photoUrl: string;
  photoType: string;
  caption: string | null;
  createdAt: string;
}

interface ShortageType {
  id: number;
  productName: string;
  productNameAr: string | null;
  notes: string | null;
  createdAt: string;
}

export default function VisitsPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();

  const [visits, setVisits] = useState<VisitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedVisit, setSelectedVisit] = useState<VisitDetailType | null>(null);
  const [photos, setPhotos] = useState<PhotoType[]>([]);
  const [shortages, setShortages] = useState<ShortageType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [newVisitModal, setNewVisitModal] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: number; name: string; nameAr: string | null }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [startingVisit, setStartingVisit] = useState(false);

  const [activePhotos, setActivePhotos] = useState<PhotoType[]>([]);
  const [activeShortages, setActiveShortages] = useState<ShortageType[]>([]);
  const [photoType, setPhotoType] = useState<'shelf' | 'display'>('shelf');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [endingVisit, setEndingVisit] = useState(false);
  const [shortageChoice, setShortageChoice] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [shortageProductName, setShortageProductName] = useState('');
  const [addingShortage, setAddingShortage] = useState(false);

  const isRep = user?.role === 'representative';

  useEffect(() => {
    fetchVisits();
    if (isRep) fetchBranches();
  }, [statusFilter, isRep]);

  const activeVisit = useMemo(
    () => visits.find((v) => v.status === 'in_progress' && (!isRep || v.representativeId === user?.id)) || null,
    [visits, isRep, user?.id]
  );

  useEffect(() => {
    if (activeVisit) {
      fetchActiveVisitAssets(activeVisit.id);
    } else {
      setActivePhotos([]);
      setActiveShortages([]);
      setShortageChoice('unknown');
      setShortageProductName('');
      setPhotoFile(null);
    }
  }, [activeVisit?.id]);

  const fetchVisits = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/visits?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits);
      }
    } catch (error) {
      console.error('Failed to fetch visits:', error);
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

  const fetchActiveVisitAssets = async (visitId: number) => {
    try {
      const [photosRes, shortagesRes] = await Promise.all([
        fetch(`/api/visits/${visitId}/photos`),
        fetch(`/api/visits/${visitId}/shortages`),
      ]);

      if (photosRes.ok) {
        const photosData = await photosRes.json();
        setActivePhotos(photosData.photos);
      }
      if (shortagesRes.ok) {
        const shortagesData = await shortagesRes.json();
        setActiveShortages(shortagesData.shortages);
        setShortageChoice(shortagesData.shortages.length > 0 ? 'yes' : 'unknown');
      }
    } catch (error) {
      console.error('Failed to fetch active visit assets:', error);
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error(lang === 'ar' ? 'المتصفح لا يدعم الموقع الجغرافي' : 'Geolocation is not supported');
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: true,
      });
    });

    return {
      lat: position.coords.latitude.toString(),
      lng: position.coords.longitude.toString(),
    };
  };

  const fetchVisitDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/visits/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedVisit(data.visit);
        setPhotos(data.photos);
        setShortages(data.shortages);
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch visit detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const startVisit = async () => {
    if (!selectedBranchId) return;
    setStartingVisit(true);

    try {
      const location = await getCurrentLocation();
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: parseInt(selectedBranchId),
          checkInLat: location.lat,
          checkInLng: location.lng,
          notes: visitNotes,
        }),
      });

      if (res.ok) {
        setNewVisitModal(false);
        setSelectedBranchId('');
        setVisitNotes('');
        await fetchVisits();
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'ar' ? 'فشل في بدء الزيارة' : 'Failed to start visit'));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : lang === 'ar' ? 'يجب السماح بالموقع لبدء الزيارة' : 'Location is required to start the visit');
    } finally {
      setStartingVisit(false);
    }
  };

  const uploadPhoto = async () => {
    if (!activeVisit || !photoFile) return;
    if (activePhotos.length >= 2) {
      alert(lang === 'ar' ? 'الحد الأقصى صورتين لكل زيارة' : 'Maximum 2 photos per visit');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('photoType', photoType);
      formData.append('caption', photoType === 'shelf' ? (lang === 'ar' ? 'صورة الرف' : 'Shelf photo') : (lang === 'ar' ? 'صورة العرض' : 'Display photo'));

      const res = await fetch(`/api/visits/${activeVisit.id}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setPhotoFile(null);
        const input = document.getElementById('visit-photo-input') as HTMLInputElement | null;
        if (input) input.value = '';
        await fetchActiveVisitAssets(activeVisit.id);
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'ar' ? 'فشل في رفع الصورة' : 'Failed to upload photo'));
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      alert(lang === 'ar' ? 'فشل في رفع الصورة' : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addShortage = async () => {
    if (!activeVisit || !shortageProductName.trim()) return;
    setAddingShortage(true);

    try {
      const res = await fetch(`/api/visits/${activeVisit.id}/shortages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNameAr: shortageProductName.trim() }),
      });

      if (res.ok) {
        setShortageProductName('');
        setShortageChoice('yes');
        await fetchActiveVisitAssets(activeVisit.id);
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'ar' ? 'فشل في إضافة النقص' : 'Failed to add shortage'));
      }
    } catch (error) {
      console.error('Add shortage error:', error);
    } finally {
      setAddingShortage(false);
    }
  };

  const endVisit = async () => {
    if (!activeVisit) return;

    if (activePhotos.length === 0) {
      alert(lang === 'ar' ? 'يجب رفع صورة واحدة على الأقل قبل إنهاء الزيارة' : 'Please upload at least one photo before ending the visit');
      return;
    }

    if (shortageChoice === 'unknown') {
      alert(lang === 'ar' ? 'يرجى تحديد هل يوجد نقص أم لا قبل إنهاء الزيارة' : 'Please specify whether there is a shortage before ending the visit');
      return;
    }

    if (shortageChoice === 'yes' && activeShortages.length === 0) {
      alert(lang === 'ar' ? 'يرجى إدخال اسم منتج واحد على الأقل ضمن النواقص' : 'Please add at least one shortage product before ending the visit');
      return;
    }

    setEndingVisit(true);
    try {
      const location = await getCurrentLocation();
      const res = await fetch(`/api/visits/${activeVisit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          checkOutLat: location.lat,
          checkOutLng: location.lng,
        }),
      });

      if (res.ok) {
        await fetchVisits();
      } else {
        const data = await res.json();
        alert(data.error || (lang === 'ar' ? 'فشل في إنهاء الزيارة' : 'Failed to end visit'));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : lang === 'ar' ? 'يجب السماح بالموقع لإنهاء الزيارة' : 'Location is required to end the visit');
    } finally {
      setEndingVisit(false);
    }
  };

  const statusOptions = [
    { value: '', label: lang === 'ar' ? 'جميع الحالات' : 'All Statuses' },
    { value: 'pending', label: lang === 'ar' ? 'معلقة' : 'Pending' },
    { value: 'in_progress', label: lang === 'ar' ? 'جارية' : 'In Progress' },
    { value: 'completed', label: lang === 'ar' ? 'مكتملة' : 'Completed' },
    { value: 'cancelled', label: lang === 'ar' ? 'ملغاة' : 'Cancelled' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('visits')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? 'عرض ومتابعة الزيارات' : 'View and track visits'}
            </p>
          </div>
          {isRep && !activeVisit && (
            <Button onClick={() => setNewVisitModal(true)}>{t('startVisit')}</Button>
          )}
        </div>

        {isRep && activeVisit && (
          <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Clock size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {lang === 'ar' ? 'زيارة جارية' : 'Active Visit'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {lang === 'ar' && activeVisit.branchNameAr ? activeVisit.branchNameAr : activeVisit.branchName}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{lang === 'ar' ? 'وقت الحضور' : 'Check-in'}: {activeVisit.checkInTime ? formatTime(activeVisit.checkInTime) : '-'}</span>
                      {activeVisit.checkInLat && activeVisit.checkInLng && (
                        <a
                          href={`https://maps.google.com/?q=${activeVisit.checkInLat},${activeVisit.checkInLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <MapPin size={14} />
                          {lang === 'ar' ? 'موقع الحضور' : 'Check-in GPS'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="primary" onClick={endVisit} loading={endingVisit}>
                  <CheckCircle size={18} />
                  {t('endVisit')}
                </Button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl bg-white/70 dark:bg-gray-800/70 p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Camera size={18} />
                      {lang === 'ar' ? 'رفع الصور' : 'Upload Photos'}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{activePhotos.length}/2</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePhotos.map((photo) => (
                      <div key={photo.id} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <img src={photo.photoUrl} alt={photo.caption || 'Visit photo'} className="h-36 w-full object-cover" />
                        <div className="p-2 text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
                          <span>{photo.photoType === 'shelf' ? (lang === 'ar' ? 'صورة الرف' : 'Shelf') : (lang === 'ar' ? 'صورة العرض' : 'Display')}</span>
                          <span>{formatTime(photo.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    {activePhotos.length === 0 && (
                      <div className="col-span-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-sm text-gray-500">
                        {lang === 'ar' ? 'لا توجد صور مرفوعة بعد' : 'No photos uploaded yet'}
                      </div>
                    )}
                  </div>

                  {activePhotos.length < 2 && (
                    <div className="space-y-3">
                      <Select
                        value={photoType}
                        onChange={(e) => setPhotoType(e.target.value as 'shelf' | 'display')}
                        options={[
                          { value: 'shelf', label: lang === 'ar' ? 'صورة الرف' : 'Shelf Photo' },
                          { value: 'display', label: lang === 'ar' ? 'صورة العرض' : 'Display Photo' },
                        ]}
                      />
                      <Input
                        id="visit-photo-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      />
                      <Button onClick={uploadPhoto} disabled={!photoFile} loading={uploadingPhoto} className="w-full">
                        <Upload size={18} />
                        {lang === 'ar' ? 'رفع الصورة' : 'Upload Photo'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-xl bg-white/70 dark:bg-gray-800/70 p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {lang === 'ar' ? 'تسجيل النواقص' : 'Record Shortages'}
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShortageChoice('no')}
                      className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${shortageChoice === 'no' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      {lang === 'ar' ? 'لا يوجد نقص' : 'No Shortage'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortageChoice('yes')}
                      className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${shortageChoice === 'yes' ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      {lang === 'ar' ? 'يوجد نقص' : 'Has Shortage'}
                    </button>
                  </div>

                  {shortageChoice === 'yes' && (
                    <div className="space-y-3">
                      <Input
                        label={lang === 'ar' ? 'اسم المنتج' : 'Product Name'}
                        value={shortageProductName}
                        onChange={(e) => setShortageProductName(e.target.value)}
                        placeholder={lang === 'ar' ? 'اكتب اسم المنتج فقط' : 'Enter product name only'}
                      />
                      <Button onClick={addShortage} disabled={!shortageProductName.trim()} loading={addingShortage} className="w-full">
                        {lang === 'ar' ? 'إضافة المنتج الناقص' : 'Add Shortage Product'}
                      </Button>
                    </div>
                  )}

                  {activeShortages.length > 0 && (
                    <div className="space-y-2">
                      {activeShortages.map((shortage) => (
                        <div key={shortage.id} className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between gap-2">
                          <span>{shortage.productNameAr || shortage.productName}</span>
                          <span className="text-xs opacity-70">{formatTime(shortage.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card padding="none">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loading /></div>
          ) : visits.length === 0 ? (
            <EmptyState
              icon={<Building2 />}
              title={lang === 'ar' ? 'لا توجد زيارات' : 'No visits found'}
              description={lang === 'ar' ? 'لم يتم تسجيل أي زيارات بعد' : 'No visits have been recorded yet'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                  {!isRep && <TableHead className="hidden md:table-cell">{lang === 'ar' ? 'المندوب' : 'Representative'}</TableHead>}
                  <TableHead>{lang === 'ar' ? 'الحضور' : 'Check In'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{lang === 'ar' ? 'الانصراف' : 'Check Out'}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-gray-400" />
                        <span>{lang === 'ar' && visit.branchNameAr ? visit.branchNameAr : visit.branchName}</span>
                      </div>
                    </TableCell>
                    {!isRep && (
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <User size={18} className="text-gray-400" />
                          <span>{visit.representativeName}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{visit.checkInTime ? formatTime(visit.checkInTime) : '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{visit.checkOutTime ? formatTime(visit.checkOutTime) : '-'}</TableCell>
                    <TableCell><StatusBadge status={visit.status} lang={lang} /></TableCell>
                    <TableCell>
                      <button
                        onClick={() => fetchVisitDetail(visit.id)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('visitDetails')} size="lg">
          {loadingDetail ? (
            <Loading />
          ) : selectedVisit && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('branches')}</p>
                  <p className="font-medium">{lang === 'ar' && selectedVisit.branchNameAr ? selectedVisit.branchNameAr : selectedVisit.branchName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('status')}</p>
                  <StatusBadge status={selectedVisit.status} lang={lang} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('checkIn')}</p>
                  <p className="font-medium">{selectedVisit.checkInTime ? formatDateTime(selectedVisit.checkInTime) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('checkOut')}</p>
                  <p className="font-medium">{selectedVisit.checkOutTime ? formatDateTime(selectedVisit.checkOutTime) : '-'}</p>
                </div>
                {selectedVisit.checkInLat && selectedVisit.checkInLng && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{lang === 'ar' ? 'موقع الحضور' : 'Check-in Location'}</p>
                    <a href={`https://maps.google.com/?q=${selectedVisit.checkInLat},${selectedVisit.checkInLng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      <MapPin size={16} />
                      {lang === 'ar' ? 'عرض على الخريطة' : 'View on Map'}
                    </a>
                  </div>
                )}
                {selectedVisit.checkOutLat && selectedVisit.checkOutLng && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{lang === 'ar' ? 'موقع الانصراف' : 'Check-out Location'}</p>
                    <a href={`https://maps.google.com/?q=${selectedVisit.checkOutLat},${selectedVisit.checkOutLng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      <MapPin size={16} />
                      {lang === 'ar' ? 'عرض على الخريطة' : 'View on Map'}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2"><ImageIcon size={18} />{lang === 'ar' ? 'الصور' : 'Photos'}</h4>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img src={photo.photoUrl} alt={photo.caption || 'Visit photo'} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-xs p-2 flex items-center justify-between">
                          <span>{photo.caption || photo.photoType}</span>
                          <span>{formatTime(photo.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{lang === 'ar' ? 'لا توجد صور لهذه الزيارة' : 'No photos for this visit'}</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-500" />{t('shortages')}</h4>
                {shortages.length > 0 ? (
                  <div className="space-y-2">
                    {shortages.map((shortage) => (
                      <div key={shortage.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-between gap-2">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">{shortage.productNameAr || shortage.productName}</p>
                        <span className="text-xs text-yellow-700 dark:text-yellow-300">{formatTime(shortage.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{lang === 'ar' ? 'لا يوجد نقص' : 'No shortages'}</p>
                )}
              </div>

              {selectedVisit.notes && (
                <div>
                  <h4 className="font-medium mb-2">{t('notes')}</h4>
                  <p className="text-gray-600 dark:text-gray-300">{selectedVisit.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal isOpen={newVisitModal} onClose={() => setNewVisitModal(false)} title={t('startVisit')}>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
              {lang === 'ar' ? 'سيتم حفظ وقت الحضور والموقع الجغرافي تلقائياً عند البدء.' : 'Check-in time and GPS location will be saved automatically when you start.'}
            </div>
            <Select
              label={t('branches')}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              options={[
                { value: '', label: lang === 'ar' ? 'اختر فرع' : 'Select Branch' },
                ...branches.map((b) => ({
                  value: b.id.toString(),
                  label: lang === 'ar' && b.nameAr ? b.nameAr : b.name,
                })),
              ]}
            />
            <Textarea
              label={t('notes')}
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              rows={3}
              placeholder={lang === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setNewVisitModal(false)}>{t('cancel')}</Button>
              <Button onClick={startVisit} loading={startingVisit} disabled={!selectedBranchId}>{t('startVisit')}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

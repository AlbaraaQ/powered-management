'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, MapPin, Phone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';

interface BranchType {
  id: number;
  name: string;
  nameAr: string | null;
  address: string | null;
  addressAr: string | null;
  latitude: string | null;
  longitude: string | null;
  clientId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  active: boolean;
  createdAt: string;
}

interface ClientType {
  id: number;
  name: string;
  nameAr: string | null;
}

export default function BranchesPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [clients, setClients] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchType | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    address: '',
    addressAr: '',
    latitude: '',
    longitude: '',
    clientId: '',
    contactName: '',
    contactPhone: '',
    active: true,
  });

  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    fetchBranches();
    if (canEdit) {
      fetchClients();
    }
  }, [search]);

  const fetchBranches = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('active', 'true');

      const res = await fetch(`/api/branches?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/users?role=client');
      if (res.ok) {
        const data = await res.json();
        setClients(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleOpenModal = (branch?: BranchType) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        nameAr: branch.nameAr || '',
        address: branch.address || '',
        addressAr: branch.addressAr || '',
        latitude: branch.latitude || '',
        longitude: branch.longitude || '',
        clientId: branch.clientId?.toString() || '',
        contactName: branch.contactName || '',
        contactPhone: branch.contactPhone || '',
        active: branch.active,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        nameAr: '',
        address: '',
        addressAr: '',
        latitude: '',
        longitude: '',
        clientId: '',
        contactName: '',
        contactPhone: '',
        active: true,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : '/api/branches';
      const method = editingBranch ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchBranches();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save branch');
      }
    } catch (error) {
      console.error('Failed to save branch:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الفرع؟' : 'Are you sure you want to delete this branch?')) {
      return;
    }

    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBranches();
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert(lang === 'ar' ? 'فشل في الحصول على الموقع' : 'Failed to get location');
        }
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('branches')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? 'إدارة فروع العملاء' : 'Manage client branches'}
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => handleOpenModal()} icon={<Plus size={20} />}>
              {t('addBranch')}
            </Button>
          )}
        </div>

        {/* Search */}
        <Card>
          <Input
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
          />
        </Card>

        {/* Branches Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        ) : branches.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                {lang === 'ar' ? 'لا توجد فروع' : 'No branches found'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {lang === 'ar' ? 'قم بإضافة فرع جديد للبدء' : 'Add a new branch to get started'}
              </p>
              {canEdit && (
                <Button onClick={() => handleOpenModal()} icon={<Plus size={20} />}>
                  {t('addBranch')}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <Card key={branch.id} className="card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge variant={branch.active ? 'success' : 'danger'}>
                    {branch.active ? t('active') : t('inactive')}
                  </Badge>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {lang === 'ar' && branch.nameAr ? branch.nameAr : branch.name}
                </h3>

                {branch.address && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1 mb-2">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">
                      {lang === 'ar' && branch.addressAr ? branch.addressAr : branch.address}
                    </span>
                  </p>
                )}

                {branch.contactPhone && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone size={14} />
                    {branch.contactPhone}
                  </p>
                )}

                {canEdit && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleOpenModal(branch)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                      {t('delete')}
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingBranch ? t('editBranch') : t('addBranch')}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={lang === 'ar' ? 'اسم الفرع (إنجليزي - اختياري)' : 'Branch Name (English - optional)'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label={lang === 'ar' ? 'اسم الفرع (عربي - اختياري)' : 'Branch Name (Arabic - optional)'}
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              />
            </div>

            <Textarea
              label={lang === 'ar' ? 'العنوان (إنجليزي)' : 'Address (English)'}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />

            <Textarea
              label={lang === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}
              value={formData.addressAr}
              onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
              rows={2}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={lang === 'ar' ? 'خط العرض' : 'Latitude'}
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="24.7136"
              />
              <Input
                label={lang === 'ar' ? 'خط الطول' : 'Longitude'}
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="46.6753"
              />
            </div>

            <Button variant="outline" onClick={getLocation} type="button">
              <MapPin size={18} />
              {lang === 'ar' ? 'الحصول على الموقع الحالي' : 'Get Current Location'}
            </Button>

            <Select
              label={lang === 'ar' ? 'العميل' : 'Client'}
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              options={[
                { value: '', label: lang === 'ar' ? 'اختر عميل' : 'Select Client' },
                ...clients.map((c) => ({
                  value: c.id.toString(),
                  label: lang === 'ar' && c.nameAr ? c.nameAr : c.name,
                })),
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('contactName')}
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
              <Input
                label={t('contactPhone')}
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">
                {t('active')}
              </label>
            </div>

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
      </div>
    </DashboardLayout>
  );
}

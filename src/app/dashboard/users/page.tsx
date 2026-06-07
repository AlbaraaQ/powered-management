'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, User } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getRoleLabel, formatDateTime } from '@/lib/utils';

interface UserType {
  id: number;
  username: string;
  email: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  role: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    nameAr: '',
    phone: '',
    role: 'representative',
    active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`/api/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: UserType) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        name: user.name,
        nameAr: user.nameAr || '',
        phone: user.phone || '',
        role: user.role,
        active: user.active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        name: '',
        nameAr: '',
        phone: '',
        role: 'representative',
        active: true,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (editingUser && !payload.password) {
        const { ...rest } = payload;
        delete (rest as Record<string, unknown>).password;
        Object.assign(payload, rest);
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const roleOptions = [
    { value: '', label: lang === 'ar' ? 'جميع الأدوار' : 'All Roles' },
    { value: 'admin', label: lang === 'ar' ? 'مدير' : 'Admin' },
    { value: 'supervisor', label: lang === 'ar' ? 'مشرف' : 'Supervisor' },
    { value: 'representative', label: lang === 'ar' ? 'مندوب' : 'Representative' },
    { value: 'client', label: lang === 'ar' ? 'عميل' : 'Client' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('users')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'Manage users and permissions'}
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} icon={<Plus size={20} />}>
            {t('addUser')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={roleOptions}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card padding="none">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loading />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<User />}
              title={lang === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
              description={lang === 'ar' ? 'قم بإضافة مستخدم جديد' : 'Add a new user to get started'}
              action={
                <Button onClick={() => handleOpenModal()} icon={<Plus size={20} />}>
                  {t('addUser')}
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead>{lang === 'ar' ? 'الدور' : 'Role'}</TableHead>
                  <TableHead className="hidden md:table-cell">{lang === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                  <TableHead className="hidden lg:table-cell">{lang === 'ar' ? 'آخر دخول' : 'Last Login'}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <User size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{lang === 'ar' && user.nameAr ? user.nameAr : user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{getRoleLabel(user.role, lang)}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.phone || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.lastLogin ? formatDateTime(user.lastLogin, lang === 'ar' ? 'ar-SA' : 'en-US') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'success' : 'danger'}>
                        {user.active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingUser ? t('editUser') : t('addUser')}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('username')}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <Input
                label={t('email')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <Input
              label={t('password')}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingUser ? (lang === 'ar' ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : 'Leave empty to keep current password') : ''}
              required={!editingUser}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={lang === 'ar' ? 'الاسم (إنجليزي - اختياري)' : 'Name (English - optional)'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label={lang === 'ar' ? 'الاسم (عربي - اختياري)' : 'Name (Arabic - optional)'}
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={lang === 'ar' ? 'الهاتف' : 'Phone'}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Select
                label={t('userRole')}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={roleOptions.slice(1)}
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

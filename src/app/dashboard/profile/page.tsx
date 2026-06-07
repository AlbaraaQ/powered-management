'use client';

import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getRoleLabel } from '@/lib/utils';

export default function ProfilePage() {
  const { lang, t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    nameAr: user?.nameAr || '',
    email: user?.email || '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr,
          email: formData.email,
        }),
      });

      if (res.ok) {
        setSuccess(lang === 'ar' ? 'تم حفظ البيانات بنجاح' : 'Profile updated successfully');
        refreshUser();
      } else {
        const data = await res.json();
        setError(data.error || (lang === 'ar' ? 'فشل في حفظ البيانات' : 'Failed to save'));
      }
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.newPassword,
        }),
      });

      if (res.ok) {
        setSuccess(lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
        setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        setError(data.error || (lang === 'ar' ? 'فشل في تغيير كلمة المرور' : 'Failed to change password'));
      }
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('profile')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {lang === 'ar' ? 'إدارة معلومات حسابك' : 'Manage your account information'}
          </p>
        </div>

        {/* Alerts */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300">
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <Card>
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-white">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-center sm:text-start">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {lang === 'ar' && user?.nameAr ? user.nameAr : user?.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
              <div className="mt-2">
                <Badge>{getRoleLabel(user?.role || '', lang)}</Badge>
              </div>
            </div>
          </div>

          <CardHeader
            title={lang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
            lang={lang}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                icon={<User size={18} />}
              />
              <Input
                label={lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                icon={<User size={18} />}
              />
            </div>

            <Input
              label={t('email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={18} />}
            />

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} loading={saving} icon={<Save size={18} />}>
                {t('save')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader
            title={lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
            lang={lang}
          />

          <div className="space-y-4">
            <div className="relative">
              <Input
                label={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                type={showPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                icon={<Lock size={18} />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Input
              label={lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              icon={<Lock size={18} />}
            />

            <div className="flex justify-end">
              <Button 
                onClick={handleChangePassword} 
                loading={saving}
                disabled={!formData.newPassword || !formData.confirmPassword}
                icon={<Lock size={18} />}
              >
                {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

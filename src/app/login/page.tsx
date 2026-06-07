'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ClipboardList, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const { user, login, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || t('invalidCredentials'));
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shadow-sm"
          >
            <Globe size={18} />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>

        <Card className="animate-fade-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('appName')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('loginSubtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label={t('username')}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
              required
              autoComplete="username"
            />

            <div className="relative">
              <Input
                label={t('password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              {t('login')}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
              {lang === 'ar' ? 'بيانات تجريبية:' : 'Demo Credentials:'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'مدير' : 'Admin'}</p>
                <p className="text-gray-500 dark:text-gray-400">admin / admin123</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="font-medium text-gray-700 dark:text-gray-300">{lang === 'ar' ? 'مندوب' : 'Rep'}</p>
                <p className="text-gray-500 dark:text-gray-400">rep1 / rep123</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {lang === 'ar' ? '© 2026 نظام إدارة المندوبين' : '© 2026 Field Reps Manager'}
        </p>
      </div>
    </div>
  );
}

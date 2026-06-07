'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Key, Bot, Globe, Shield, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface SettingType {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  category: string;
}

export default function SettingsPage() {
  const { t, lang } = useLanguage();
  const [settings, setSettings] = useState<SettingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [success, setSuccess] = useState('');

  // Form values
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);

        // Initialize form values
        const values: Record<string, string> = {};
        data.settings.forEach((s: SettingType) => {
          values[s.key] = s.value || '';
        });
        setFormValues(values);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    
    try {
      const settingsToUpdate = Object.entries(formValues).map(([key, value]) => ({
        key,
        value,
        // Category will be determined by the API based on key prefix
      }));

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToUpdate }),
      });

      if (res.ok) {
        setSuccess(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
        fetchSettings(); // Refresh settings
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: lang === 'ar' ? 'عام' : 'General', icon: Settings },
    { id: 'ai', label: lang === 'ar' ? 'الذكاء الاصطناعي' : 'AI', icon: Bot },
    { id: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits', icon: Globe },
    { id: 'security', label: lang === 'ar' ? 'الأمان' : 'Security', icon: Shield },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loading />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('settings')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? 'إدارة إعدادات النظام' : 'Manage system settings'}
            </p>
          </div>
          <Button onClick={handleSave} loading={saving} icon={<Save size={20} />}>
            {t('saveSettings')}
          </Button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check size={20} />
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader
              title={lang === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
              lang={lang}
            />
            <div className="space-y-4">
              <Input
                label={lang === 'ar' ? 'اسم التطبيق (إنجليزي)' : 'App Name (English)'}
                value={formValues['app_name'] || ''}
                onChange={(e) => setFormValues({ ...formValues, app_name: e.target.value })}
              />
              <Input
                label={lang === 'ar' ? 'اسم التطبيق (عربي)' : 'App Name (Arabic)'}
                value={formValues['app_name_ar'] || ''}
                onChange={(e) => setFormValues({ ...formValues, app_name_ar: e.target.value })}
              />
            </div>
          </Card>
        )}

        {/* AI Settings */}
        {activeTab === 'ai' && (
          <Card>
            <CardHeader
              title={t('aiSettings')}
              titleAr="إعدادات الذكاء الاصطناعي"
              lang={lang}
            />
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {lang === 'ar'
                    ? 'قم بإدخال مفتاح API للذكاء الاصطناعي لتفعيل خاصية الدردشة الذكية والتحليلات المتقدمة.'
                    : 'Enter your AI API key to enable smart chat and advanced analytics features.'}
                </p>
              </div>

              <Select
                label={t('aiProvider')}
                value={formValues['ai_provider'] || 'openai'}
                onChange={(e) => setFormValues({ ...formValues, ai_provider: e.target.value })}
                options={[
                  { value: 'openai', label: 'OpenAI (GPT)' },
                  { value: 'google', label: 'Google AI (Gemini)' },
                  { value: 'anthropic', label: 'Anthropic (Claude)' },
                ]}
              />

              <Input
                label={t('aiModel')}
                value={formValues['ai_model'] || ''}
                onChange={(e) => setFormValues({ ...formValues, ai_model: e.target.value })}
                placeholder={
                  formValues['ai_provider'] === 'google' 
                    ? 'gemini-1.5-flash' 
                    : formValues['ai_provider'] === 'anthropic'
                    ? 'claude-3-haiku-20240307'
                    : 'gpt-3.5-turbo'
                }
              />

              <Input
                label={t('apiKey')}
                type="password"
                value={formValues['ai_api_key'] || ''}
                onChange={(e) => setFormValues({ ...formValues, ai_api_key: e.target.value })}
                placeholder={lang === 'ar' ? 'أدخل مفتاح API' : 'Enter API key'}
                icon={<Key size={18} />}
              />

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'ar' ? 'النماذج المقترحة:' : 'Suggested models:'}
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li><strong>OpenAI:</strong> gpt-4, gpt-3.5-turbo</li>
                  <li><strong>Google:</strong> gemini-1.5-flash, gemini-1.5-pro</li>
                  <li><strong>Anthropic:</strong> claude-3-haiku-20240307, claude-3-sonnet-20240229</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Visits Settings */}
        {activeTab === 'visits' && (
          <Card>
            <CardHeader
              title={lang === 'ar' ? 'إعدادات الزيارات' : 'Visit Settings'}
              lang={lang}
            />
            <div className="space-y-4">
              <Input
                label={lang === 'ar' ? 'الحد الأقصى للصور لكل زيارة' : 'Max Photos Per Visit'}
                type="number"
                value={formValues['max_photos_per_visit'] || '2'}
                onChange={(e) => setFormValues({ ...formValues, max_photos_per_visit: e.target.value })}
                min="1"
                max="10"
              />
            </div>
          </Card>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader
              title={lang === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
              lang={lang}
            />
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  {lang === 'ar' ? 'ميزات الأمان المفعلة' : 'Active Security Features'}
                </h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>✓ {lang === 'ar' ? 'تشفير كلمات المرور (bcrypt)' : 'Password Encryption (bcrypt)'}</li>
                  <li>✓ {lang === 'ar' ? 'رموز JWT للمصادقة' : 'JWT Authentication Tokens'}</li>
                  <li>✓ {lang === 'ar' ? 'حماية من SQL Injection' : 'SQL Injection Protection'}</li>
                  <li>✓ {lang === 'ar' ? 'التحقق من صحة المدخلات (Zod)' : 'Input Validation (Zod)'}</li>
                  <li>✓ {lang === 'ar' ? 'سجل التدقيق' : 'Audit Logging'}</li>
                  <li>✓ {lang === 'ar' ? 'حماية CSRF' : 'CSRF Protection'}</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

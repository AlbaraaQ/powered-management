'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, CheckCircle, Info, X, Send } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDateTime, cn } from '@/lib/utils';

interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  titleAr: string | null;
  message: string;
  messageAr: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [newNotification, setNewNotification] = useState({
    type: 'info',
    title: '',
    titleAr: '',
    message: '',
    messageAr: '',
  });

  const canSend = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const sendNotification = async () => {
    if (!newNotification.title || !newNotification.message) return;
    setSending(true);

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification),
      });

      if (res.ok) {
        setSendModalOpen(false);
        setNewNotification({
          type: 'info',
          title: '',
          titleAr: '',
          message: '',
          messageAr: '',
        });
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    } finally {
      setSending(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "flex-shrink-0";
    switch (type) {
      case 'success':
        return <CheckCircle className={cn(iconClass, "text-green-500")} size={24} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClass, "text-yellow-500")} size={24} />;
      case 'error':
        return <X className={cn(iconClass, "text-red-500")} size={24} />;
      default:
        return <Info className={cn(iconClass, "text-blue-500")} size={24} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Bell className="text-blue-600" />
              {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              {unreadCount > 0 && (
                <Badge variant="danger">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? 'جميع الإشعارات والتنبيهات' : 'All notifications and alerts'}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead} icon={<CheckCheck size={18} />}>
                {lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </Button>
            )}
            {canSend && (
              <Button onClick={() => setSendModalOpen(true)} icon={<Send size={18} />}>
                {lang === 'ar' ? 'إرسال إشعار' : 'Send Notification'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {lang === 'ar' ? 'الكل' : 'All'} ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {lang === 'ar' ? 'غير مقروءة' : 'Unread'} ({unreadCount})
            </button>
          </div>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                {lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread'
                  ? lang === 'ar' ? 'لا توجد إشعارات غير مقروءة' : 'No unread notifications'
                  : lang === 'ar' ? 'لم تستلم أي إشعارات بعد' : "You haven't received any notifications yet"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={cn(
                  'border-2 transition-all',
                  !notification.read && getTypeColor(notification.type),
                  notification.read && 'opacity-75'
                )}
              >
                <div className="flex gap-4">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={cn(
                          'text-base',
                          notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'
                        )}>
                          {lang === 'ar' && notification.titleAr ? notification.titleAr : notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {lang === 'ar' && notification.messageAr ? notification.messageAr : notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatDateTime(notification.createdAt, lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title={lang === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Send Notification Modal */}
        <Modal
          isOpen={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          title={lang === 'ar' ? 'إرسال إشعار جديد' : 'Send New Notification'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              {lang === 'ar' 
                ? 'سيتم إرسال هذا الإشعار لجميع المستخدمين النشطين في النظام.'
                : 'This notification will be sent to all active users in the system.'}
            </div>

            <Select
              label={lang === 'ar' ? 'نوع الإشعار' : 'Notification Type'}
              value={newNotification.type}
              onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
              options={[
                { value: 'info', label: lang === 'ar' ? 'معلومات' : 'Info' },
                { value: 'success', label: lang === 'ar' ? 'نجاح' : 'Success' },
                { value: 'warning', label: lang === 'ar' ? 'تحذير' : 'Warning' },
                { value: 'error', label: lang === 'ar' ? 'خطأ' : 'Error' },
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (English)'}
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                required
              />
              <Input
                label={lang === 'ar' ? 'العنوان (عربي)' : 'Title (Arabic)'}
                value={newNotification.titleAr}
                onChange={(e) => setNewNotification({ ...newNotification, titleAr: e.target.value })}
              />
            </div>

            <Textarea
              label={lang === 'ar' ? 'الرسالة (إنجليزي)' : 'Message (English)'}
              value={newNotification.message}
              onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
              rows={3}
              required
            />

            <Textarea
              label={lang === 'ar' ? 'الرسالة (عربي)' : 'Message (Arabic)'}
              value={newNotification.messageAr}
              onChange={(e) => setNewNotification({ ...newNotification, messageAr: e.target.value })}
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setSendModalOpen(false)}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={sendNotification} 
                loading={sending}
                disabled={!newNotification.title || !newNotification.message}
                icon={<Send size={18} />}
              >
                {lang === 'ar' ? 'إرسال' : 'Send'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

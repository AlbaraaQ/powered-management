'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface ChatMessage {
  id: number;
  message: string;
  response: string | null;
  createdAt: string;
}

export default function AIChatPage() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/ai/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.history.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add temporary user message
    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        message: userMessage,
        response: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, response: data.response } : m
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                response: lang === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.',
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestions = [
    lang === 'ar' ? 'كم عدد الزيارات اليوم؟' : 'How many visits today?',
    lang === 'ar' ? 'ما هي أكثر المنتجات نقصاً؟' : 'What are the most common shortages?',
    lang === 'ar' ? 'أعطني تقرير عن أداء المندوبين' : 'Give me a report on rep performance',
    lang === 'ar' ? 'ما هي الفروع التي لم تتم زيارتها؟' : 'Which branches were not visited?',
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('aiChat')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar'
                ? 'اسأل الذكاء الاصطناعي عن التحليلات والتقارير'
                : 'Ask AI about analytics and reports'}
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" onClick={clearChat} icon={<Trash2 size={18} />}>
              {lang === 'ar' ? 'مسح المحادثة' : 'Clear Chat'}
            </Button>
          )}
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden" padding="none">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <Bot size={32} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {lang === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                  {lang === 'ar'
                    ? 'اسألني عن أي شيء يتعلق بالزيارات، التقارير، النواقص، أو أداء المندوبين.'
                    : 'Ask me anything about visits, reports, shortages, or representative performance.'}
                </p>

                {/* Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(suggestion)}
                      className="p-3 text-sm text-start bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  {/* User Message */}
                  <div className="flex gap-3 justify-end">
                    <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  {/* AI Response */}
                  {msg.response !== null && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="max-w-[80%] bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                        <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
                          {msg.response}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator for pending response */}
                  {msg.response === null && loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">{t('aiThinking')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('aiPlaceholder')}
                  rows={1}
                  className="resize-none min-h-[44px] max-h-32"
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="h-11 w-11 p-0"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {lang === 'ar'
                ? 'اضغط Enter للإرسال، Shift+Enter لسطر جديد'
                : 'Press Enter to send, Shift+Enter for new line'}
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

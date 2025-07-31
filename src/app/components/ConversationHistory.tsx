"use client";

import { useState, useEffect } from 'react';
import { History, Trash2, Download, Plus, BarChart3, Calendar, MessageSquare, DollarSign, X } from 'lucide-react';
import { ConversationManager, ConversationSession, SessionStats } from '@/lib/conversation-manager';
import { Language, t } from '@/lib/translations';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  language: Language;
}

export default function ConversationHistory({
  isOpen,
  onClose,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  language
}: ConversationHistoryProps) {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    if (isOpen) {
      const loadedSessions = ConversationManager.getSessions();
      setSessions(loadedSessions);
      setStats(ConversationManager.getStats());
    }
  }, [isOpen]);

  const handleDeleteSession = (sessionId: string) => {
    if (deleteConfirm === sessionId) {
      ConversationManager.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setStats(ConversationManager.getStats());
      setDeleteConfirm(null);
      
      // If we deleted the current session, start a new one
      if (sessionId === currentSessionId) {
        onNewSession();
      }
    } else {
      setDeleteConfirm(sessionId);
    }
  };

  const handleExportSession = (sessionId: string) => {
    ConversationManager.exportSession(sessionId, 'json');
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return t('justNow', language);
    } else if (diffInHours < 24) {
      return t('hoursAgo', language, { hours: Math.floor(diffInHours).toString() });
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return t('daysAgo', language, { days: days.toString() });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="bg-white w-80 h-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t('conversationHistory', language)}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-md"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={onNewSession}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('newConversation', language)}
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              {t('stats', language)}
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        {showStats && stats && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">{t('conversationStats', language)}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-medium">{stats.totalSessions}</div>
                  <div className="text-gray-500">{t('sessions', language)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-medium">{stats.totalMessages}</div>
                  <div className="text-gray-500">{t('messages', language)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <div>
                  <div className="font-medium">${stats.totalCost.toFixed(3)}</div>
                  <div className="text-gray-500">{t('totalCost', language)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="font-medium">{stats.averageMessagesPerSession}</div>
                  <div className="text-gray-500">{t('avgPerSession', language)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm">{t('noConversations', language)}</p>
              <p className="text-xs mt-1">{t('startFirstConversation', language)}</p>
            </div>
          ) : (
            <div className="p-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    session.id === currentSessionId
                      ? 'bg-blue-100 border-blue-200 border'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatDate(session.updatedAt)}</span>
                        <span>{session.messageCount} {t('messages', language)}</span>
                        {session.totalCost > 0 && (
                          <span>${session.totalCost.toFixed(3)}</span>
                        )}
                      </div>
                      {session.language === 'de' && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            DE
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportSession(session.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                        title={t('exportSession', language)}
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className={`p-1 hover:bg-red-100 rounded transition-colors ${
                          deleteConfirm === session.id
                            ? 'text-red-600 bg-red-100'
                            : 'text-gray-400 hover:text-red-600'
                        }`}
                        title={deleteConfirm === session.id ? t('confirmDelete', language) : t('deleteSession', language)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            {t('conversationsSaved', language, { count: sessions.length.toString() })}
          </div>
        </div>
      </div>
      
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
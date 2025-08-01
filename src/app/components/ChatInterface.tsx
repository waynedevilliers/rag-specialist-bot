"use client";

import { useState, useEffect } from "react";
import { Send, Bot, User, Loader2, Download, FileText, FileSpreadsheet, FileImage, Zap, DollarSign, Globe, History } from "lucide-react";
import SourceCitations from "./SourceCitations";
import ConversationHistory from "./ConversationHistory";
import { DocumentSource } from "@/lib/rag-system";
import { Language, t } from "@/lib/translations";
import { ConversationManager, ConversationSession } from "@/lib/conversation-manager";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Format timestamp consistently for SSR compatibility
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  embeddingTokens?: number;
  cost: {
    promptCost: number;
    completionCost: number;
    embeddingCost: number;
    totalCost: number;
  };
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
  processingTime?: number;
  tokenUsage?: TokenUsage;
}

function TokenUsageDisplay({ tokenUsage, language }: { tokenUsage: TokenUsage; language: Language }) {
  
  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs space-y-1">
      <div className="flex items-center gap-4 text-gray-600">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>{t('tokens', language)}: {tokenUsage.totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          <span>{t('cost', language)}: ${tokenUsage.cost.totalCost.toFixed(5)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-gray-500">
        <div>{t('prompt', language)}: {tokenUsage.promptTokens.toLocaleString()}</div>
        <div>{t('completion', language)}: {tokenUsage.completionTokens.toLocaleString()}</div>
        <div>{t('embedding', language)}: {tokenUsage.embeddingTokens?.toLocaleString() || '0'}</div>
        <div>{t('totalCost', language)}: ${tokenUsage.cost.totalCost.toFixed(5)}</div>
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessionStats, setSessionStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    totalMessages: 0
  });
  const [isClient, setIsClient] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, language }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();


      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.content || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        sources: data.sources,
        processingTime: data.processingTime,
        tokenUsage: data.tokenUsage,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update session stats
      if (data.tokenUsage) {
        setSessionStats(prev => ({
          totalTokens: prev.totalTokens + data.tokenUsage.totalTokens,
          totalCost: prev.totalCost + data.tokenUsage.cost.totalCost,
          totalMessages: prev.totalMessages + 1
        }));
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "I'm experiencing technical difficulties. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Set client-side flag and initialize language and session
  useEffect(() => {
    setIsClient(true);
    
    // Load saved language preference
    const savedLanguage = localStorage.getItem('fashion-assistant-language') as Language;
    if (savedLanguage && ['en', 'de'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
    
    // Initialize or migrate conversation sessions
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const initializeSession = () => {
    // Check if we need to migrate existing conversation
    const migratedSession = ConversationManager.migrateExistingConversation();
    if (migratedSession) {
      setCurrentSession(migratedSession);
      setMessages(migratedSession.messages);
      calculateSessionStats(migratedSession.messages);
      return;
    }
    
    // Try to load current session
    const currentSessionId = ConversationManager.getCurrentSessionId();
    if (currentSessionId) {
      const session = ConversationManager.getSession(currentSessionId);
      if (session) {
        setCurrentSession(session);
        setMessages(session.messages);
        calculateSessionStats(session.messages);
        return;
      }
    }
    
    // Create new session if none exists
    createNewSession();
  };
  
  const createNewSession = () => {
    const newSession = ConversationManager.createSession(language);
    setCurrentSession(newSession);
    setMessages([]);
    setSessionStats({ totalTokens: 0, totalCost: 0, totalMessages: 0 });
    ConversationManager.setCurrentSession(newSession.id);
  };
  
  const calculateSessionStats = (msgs: Message[]) => {
    const stats = msgs.reduce((acc, msg) => {
      if (msg.type === 'assistant' && msg.tokenUsage) {
        return {
          totalTokens: acc.totalTokens + msg.tokenUsage.totalTokens,
          totalCost: acc.totalCost + msg.tokenUsage.cost.totalCost,
          totalMessages: acc.totalMessages + 1
        };
      }
      return acc;
    }, { totalTokens: 0, totalCost: 0, totalMessages: 0 });
    
    setSessionStats(stats);
  };

  // Save current session when messages change
  useEffect(() => {
    if (currentSession && messages.length > 0) {
      ConversationManager.updateSession(currentSession.id, messages);
    }
  }, [currentSession, messages]);


  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // Update welcome message when language changes
  useEffect(() => {
    if (isClient) {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "assistant",
        content: t('welcomeMessage', language),
        timestamp: new Date('2025-01-01T00:00:00Z'),
      };
      
      setMessages(prev => {
        // If there are no messages or only a welcome message, set the new welcome
        if (prev.length === 0 || (prev.length === 1 && prev[0].id === "welcome")) {
          return [welcomeMessage];
        }
        // If there are other messages, update the welcome message if it exists
        return prev.map(msg => msg.id === "welcome" ? welcomeMessage : msg);
      });
    }
  }, [language, isClient]);

  const exportAsJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      conversationLength: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        sources: msg.sources,
        processingTime: msg.processingTime,
        tokenUsage: msg.tokenUsage
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fashion-assistant-conversation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportAsCSV = () => {
    const csvHeader = 'Type,Content,Timestamp,Processing Time (ms),Sources Count,Total Tokens,Total Cost ($)\n';
    const csvRows = messages.map(msg => {
      const content = msg.content.replace(/"/g, '""').replace(/\n/g, ' ');
      const sourcesCount = msg.sources ? msg.sources.length : 0;
      const totalTokens = msg.tokenUsage?.totalTokens || '';
      const totalCost = msg.tokenUsage?.cost.totalCost.toFixed(5) || '';
      return `"${msg.type}","${content}","${msg.timestamp.toISOString()}","${msg.processingTime || ''}","${sourcesCount}","${totalTokens}","${totalCost}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fashion-assistant-conversation-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportAsPDF = async () => {
    try {
      const messagesContainer = document.getElementById('messages-container');
      if (!messagesContainer) return;

      const canvas = await html2canvas(messagesContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add title
      pdf.setFontSize(16);
      pdf.text('ELLU Studios Fashion Assistant Conversation', 20, 20);
      pdf.setFontSize(10);
      pdf.text(`Exported on: ${new Date().toLocaleString()}`, 20, 30);
      
      position = 40;
      heightLeft = imgHeight;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`fashion-assistant-conversation-${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const clearConversation = () => {
    createNewSession();
    setShowExportMenu(false);
  };
  
  const handleSessionSelect = (sessionId: string) => {
    const session = ConversationManager.getSession(sessionId);
    if (session) {
      setCurrentSession(session);
      setMessages(session.messages);
      calculateSessionStats(session.messages);
      ConversationManager.setCurrentSession(sessionId);
      setLanguage(session.language);
    }
    setShowHistoryPanel(false);
  };
  
  const handleNewSession = () => {
    createNewSession();
    setShowHistoryPanel(false);
  };

  const switchLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('fashion-assistant-language', newLanguage);
    setShowLanguageMenu(false);
  };

  return (
    <>
      <ConversationHistory
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        currentSessionId={currentSession?.id || null}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        language={language}
      />
      
      <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t('appTitle', language)}</h1>
              <p className="text-sm text-gray-500">{t('appDescription', language)}</p>
              {sessionStats.totalMessages > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {t('sessionStats', language, {
                    messages: sessionStats.totalMessages.toString(),
                    tokens: sessionStats.totalTokens.toLocaleString(),
                    cost: sessionStats.totalCost.toFixed(5)
                  })}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* History Panel Toggle */}
            <button
              onClick={() => setShowHistoryPanel(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              {t('conversationHistory', language)}
            </button>
            
            {/* Language Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" />
                {language === 'en' ? 'EN' : 'DE'}
              </button>
              
              {showLanguageMenu && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={() => switchLanguage('en')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                        language === 'en' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => switchLanguage('de')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                        language === 'de' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      Deutsch
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Export Menu */}
            <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={messages.length <= 1}
            >
              <Download className="w-4 h-4" />
              {t('exportButton', language)}
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <button
                    onClick={exportAsJSON}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                  >
                    <FileText className="w-4 h-4" />
                    {t('exportAsJSON', language)}
                  </button>
                  <button
                    onClick={exportAsCSV}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {t('exportAsCSV', language)}
                  </button>
                  <button
                    onClick={exportAsPDF}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                  >
                    <FileImage className="w-4 h-4" />
                    {t('exportAsPDF', language)}
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={clearConversation}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                  >
                    {t('clearConversation', language)}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div id="messages-container" className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "assistant" && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div className={`${message.type === "user" ? "max-w-[70%]" : "max-w-[85%]"}`}>
              <div
                className={`rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900 border"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs opacity-60">
                    {isClient ? formatTime(message.timestamp) : '--:--:--'}
                  </div>
                  {message.processingTime && (
                    <div className="text-xs opacity-60">
                      {message.processingTime}ms
                    </div>
                  )}
                </div>
              </div>
              {message.type === "assistant" && message.sources && (
                <SourceCitations sources={message.sources} />
              )}
              {message.type === "assistant" && message.tokenUsage && (
                <TokenUsageDisplay tokenUsage={message.tokenUsage} language={language} />
              )}
            </div>
            
            {message.type === "user" && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 text-gray-900 border rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('processing', language)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('inputPlaceholder', language)}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {t('keyboardHint', language)}
        </div>
      </div>
    </div>
    </>
  );
}
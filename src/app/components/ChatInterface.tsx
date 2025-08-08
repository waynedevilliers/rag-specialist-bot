"use client";

import { useState, useEffect } from "react";
import { Send, Bot, User, Loader2, Download, FileText, FileSpreadsheet, FileImage, Zap, DollarSign, Globe, History, Menu, X } from "lucide-react";
import SourceCitations from "./SourceCitations";
import ConversationHistory from "./ConversationHistory";
import ModelSelector from "./ModelSelector";
import { DocumentSource } from "@/lib/rag-system";
import { Language, t } from "@/lib/translations";
import { ConversationManager, ConversationSession } from "@/lib/conversation-manager";
import { ModelConfig } from "@/lib/model-service";

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
    <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-rose-25 to-pink-25 border border-rose-100 rounded-md text-xs sm:text-sm space-y-1 sm:space-y-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-rose-700">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-rose-500" />
          <span>{t('tokens', language)}: {tokenUsage.totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-rose-500" />
          <span>{t('cost', language)}: ${tokenUsage.cost.totalCost.toFixed(5)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-rose-600 text-xs">
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
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const scrollToLatestMessage = () => {
    // Find the latest assistant message and scroll to it
    const messageElements = document.querySelectorAll('[data-message-id]');
    if (messageElements.length > 0) {
      const latestMessage = messageElements[messageElements.length - 1];
      latestMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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
        body: JSON.stringify({ message: input, language, modelConfig }),
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
      
      // Scroll to latest bot message
      setTimeout(() => scrollToLatestMessage(), 100);
      
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


  // Close menus when clicking outside or on mobile touch
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      
      // Close export menu
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
      
      // Close language menu
      if (showLanguageMenu && !target.closest('.language-menu-container')) {
        setShowLanguageMenu(false);
      }
      
      // Close mobile menu
      if (showMobileMenu && !target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showExportMenu, showLanguageMenu, showMobileMenu]);

  // Scroll to latest message when messages change
  useEffect(() => {
    if (messages.length > 1) { // Skip initial welcome message
      scrollToLatestMessage();
    }
  }, [messages]);

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

  const exportAsJSON = async () => {
    if (!currentSession) {
      alert('No conversation to export');
      return;
    }
    
    try {
      await ConversationManager.exportSession(currentSession.id, 'json');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export conversation. Please try again.');
    }
  };

  const exportAsCSV = async () => {
    if (!currentSession) {
      alert('No conversation to export');
      return;
    }
    
    try {
      await ConversationManager.exportSession(currentSession.id, 'csv');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export conversation. Please try again.');
    }
  };

  const exportAsPDF = async () => {
    if (!currentSession) {
      alert('No conversation to export');
      return;
    }
    
    try {
      await ConversationManager.exportSession(currentSession.id, 'pdf');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export conversation. Please try again.');
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
      
      <div className="flex flex-col h-screen w-full sm:max-w-4xl mx-auto bg-white sm:border-l-4 sm:border-r-4 border-rose-300">
      {/* Header */}
      <div className="border-b-2 border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg border-2 border-rose-200 shadow-sm flex-shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{t('appTitle', language)}</h1>
              <p className="text-xs sm:text-sm text-gray-500">{t('appDescription', language)}</p>
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
          
          <div className="hidden md:flex items-center gap-2">
            <ModelSelector
              currentConfig={modelConfig}
              onConfigChange={setModelConfig}
            />
            
            <button
              onClick={() => setShowHistoryPanel(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm"
            >
              <History className="w-4 h-4 text-rose-600" />
              {t('conversationHistory', language)}
            </button>
            
            <div className="relative language-menu-container">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm"
              >
                <Globe className="w-4 h-4 text-rose-600" />
                {language === 'en' ? 'EN' : 'DE'}
              </button>
              
              {showLanguageMenu && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white border-2 border-rose-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={() => switchLanguage('en')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                        language === 'en' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'hover:bg-rose-50'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => switchLanguage('de')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                        language === 'de' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'hover:bg-rose-50'
                      }`}
                    >
                      Deutsch
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={messages.length <= 1}
            >
              <Download className="w-4 h-4 text-rose-600" />
              {t('exportButton', language)}
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-rose-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <button
                    onClick={exportAsJSON}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 rounded-md"
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    {t('exportAsJSON', language)}
                  </button>
                  <button
                    onClick={exportAsCSV}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 rounded-md"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-rose-600" />
                    {t('exportAsCSV', language)}
                  </button>
                  <button
                    onClick={exportAsPDF}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 rounded-md"
                  >
                    <FileImage className="w-4 h-4 text-rose-600" />
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
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <div className="relative language-menu-container">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="p-2 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm min-h-[44px] min-w-[44px] touch-manipulation"
              >
                <Globe className="w-5 h-5 text-rose-600" />
              </button>
            </div>
            
            <div className="relative mobile-menu-container">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm min-h-[44px] min-w-[44px] touch-manipulation"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5 text-rose-600" />
                ) : (
                  <Menu className="w-5 h-5 text-rose-600" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Language Menu */}
          {showLanguageMenu && (
            <div className="absolute left-4 top-full mt-2 w-32 bg-white border-2 border-rose-200 rounded-lg shadow-lg z-20 md:hidden">
              <div className="p-2">
                <button
                  onClick={() => switchLanguage('en')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                    language === 'en' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'hover:bg-rose-50'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => switchLanguage('de')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                    language === 'de' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'hover:bg-rose-50'
                  }`}
                >
                  Deutsch
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
        
        {/* Mobile Menu Panel */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-rose-200 bg-white mobile-menu-container">
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-rose-700 uppercase tracking-wide">Model</label>
                <ModelSelector
                  currentConfig={modelConfig}
                  onConfigChange={setModelConfig}
                />
              </div>
              
              <button
                onClick={() => {
                  setShowHistoryPanel(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm"
              >
                <History className="w-5 h-5 text-rose-600" />
                {t('conversationHistory', language)}
              </button>
              
              <button
                onClick={() => {
                  setShowExportMenu(!showExportMenu);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={messages.length <= 1}
              >
                <Download className="w-5 h-5 text-rose-600" />
                {t('exportButton', language)}
              </button>
              
              {showExportMenu && (
                <div className="mt-2 p-2 bg-rose-25 border border-rose-100 rounded-lg">
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        exportAsJSON();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white rounded-md"
                    >
                      <FileText className="w-4 h-4 text-rose-600" />
                      {t('exportAsJSON', language)}
                    </button>
                    <button
                      onClick={() => {
                        exportAsCSV();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white rounded-md"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-rose-600" />
                      {t('exportAsCSV', language)}
                    </button>
                    <button
                      onClick={() => {
                        exportAsPDF();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white rounded-md"
                    >
                      <FileImage className="w-4 h-4 text-rose-600" />
                      {t('exportAsPDF', language)}
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        clearConversation();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                    >
                      {t('clearConversation', language)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div id="messages-container" className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            data-message-id={message.id}
            className={`flex gap-2 sm:gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "assistant" && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-rose-200 shadow-sm">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
              </div>
            )}
            
            <div className={`${message.type === "user" ? "max-w-[85%] sm:max-w-[70%]" : "max-w-[90%] sm:max-w-[85%]"}`}>
              <div
                className={`rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-blue-600 text-white border border-blue-500"
                    : "bg-gradient-to-br from-rose-50 to-pink-50 text-gray-900 border-2 border-rose-200 shadow-sm"
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
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-2 sm:gap-3 justify-start">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-rose-200 shadow-sm">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 text-gray-900 border-2 border-rose-200 rounded-lg p-3 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              <span className="text-sm sm:text-base">{t('processing', language)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t-2 border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-3 sm:p-4 pb-safe">
        <div className="flex gap-2 sm:gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('inputPlaceholder', language)}
            className="flex-1 p-3 sm:p-4 border-2 border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 resize-none bg-white shadow-sm text-base min-h-[48px] sm:min-h-[52px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm border border-rose-300 transition-all duration-200 min-h-[48px] sm:min-h-[52px] touch-manipulation"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        <div className="text-xs sm:text-sm text-rose-600 mt-2 hidden sm:block">
          {t('keyboardHint', language)}
        </div>
      </div>
    </>
  );
}
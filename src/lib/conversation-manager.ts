// Conversation session management utilities
import { DocumentSource } from './rag-system';

export interface TokenUsage {
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

export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
  processingTime?: number;
  tokenUsage?: TokenUsage;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  messages: Message[];
  language: 'en' | 'de';
}

export interface SessionStats {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageMessagesPerSession: number;
  mostActiveDay: string;
}

const STORAGE_KEY = 'fashion-assistant-sessions';
const CURRENT_SESSION_KEY = 'fashion-assistant-current-session';
const MAX_SESSIONS = 10; // Limit to prevent localStorage overflow

export class ConversationManager {
  // Get all stored conversation sessions
  static getSessions(): ConversationSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const sessions = JSON.parse(stored) as ConversationSession[];
      return sessions.map((session) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  }

  // Save sessions to localStorage
  static saveSessions(sessions: ConversationSession[]): void {
    try {
      // Limit the number of sessions stored
      const limitedSessions = sessions
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, MAX_SESSIONS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedSessions));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  // Create a new conversation session
  static createSession(language: 'en' | 'de' = 'en'): ConversationSession {
    const now = new Date();
    const session: ConversationSession = {
      id: `session_${now.getTime()}`,
      title: `Conversation ${now.toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      messages: [],
      language
    };

    return session;
  }

  // Update an existing session with new messages
  static updateSession(sessionId: string, messages: Message[]): void {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex >= 0) {
      const session = sessions[sessionIndex];
      
      // Calculate stats from messages
      const stats = messages.reduce((acc, msg) => {
        if (msg.type === 'assistant' && msg.tokenUsage) {
          return {
            totalTokens: acc.totalTokens + msg.tokenUsage.totalTokens,
            totalCost: acc.totalCost + msg.tokenUsage.cost.totalCost
          };
        }
        return acc;
      }, { totalTokens: 0, totalCost: 0 });

      // Update session
      sessions[sessionIndex] = {
        ...session,
        messages,
        messageCount: messages.length,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost,
        updatedAt: new Date(),
        title: this.generateSessionTitle(messages)
      };

      this.saveSessions(sessions);
    }
  }

  // Delete a conversation session
  static deleteSession(sessionId: string): void {
    const sessions = this.getSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    this.saveSessions(filteredSessions);

    // If the deleted session was current, clear current session
    const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (currentSessionId === sessionId) {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }

  // Get the current active session ID
  static getCurrentSessionId(): string | null {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  }

  // Set the current active session
  static setCurrentSession(sessionId: string): void {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
  }

  // Get session by ID
  static getSession(sessionId: string): ConversationSession | null {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  // Generate a meaningful title from conversation messages
  static generateSessionTitle(messages: Message[]): string {
    if (messages.length === 0) return `New Conversation`;
    
    // Find the first user message that's not too short
    const userMessages = messages.filter(m => m.type === 'user' && m.content.length > 10);
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0].content;
      // Take first 40 characters and ensure it ends at a word boundary
      let title = firstMessage.substring(0, 40);
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) {
        title = title.substring(0, lastSpace);
      }
      return title + (firstMessage.length > 40 ? '...' : '');
    }

    // Fallback to date-based title
    const firstMessage = messages[0];
    return `Conversation ${firstMessage.timestamp.toLocaleDateString()}`;
  }

  // Get conversation statistics
  static getStats(): SessionStats {
    const sessions = this.getSessions();
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        averageMessagesPerSession: 0,
        mostActiveDay: 'No data'
      };
    }

    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
    const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);

    // Find most active day
    const dayCount: Record<string, number> = {};
    sessions.forEach(session => {
      const day = session.createdAt.toDateString();
      dayCount[day] = (dayCount[day] || 0) + session.messageCount;
    });

    const mostActiveDay = Object.entries(dayCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No data';

    return {
      totalSessions: sessions.length,
      totalMessages,
      totalTokens,
      totalCost,
      averageMessagesPerSession: Math.round(totalMessages / sessions.length),
      mostActiveDay
    };
  }

  // Export session data
  static exportSession(sessionId: string, format: 'json' | 'csv' | 'pdf'): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    if (format === 'json') {
      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          language: session.language
        },
        stats: {
          messageCount: session.messageCount,
          totalTokens: session.totalTokens,
          totalCost: session.totalCost
        },
        messages: session.messages.map(msg => ({
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
      a.download = `session-${session.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Clear all conversation data
  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    localStorage.removeItem('fashion-assistant-messages');
    localStorage.removeItem('fashion-assistant-language');
  }

  // Migrate existing single conversation to session-based system
  static migrateExistingConversation(): ConversationSession | null {
    const existingMessages = localStorage.getItem('fashion-assistant-messages');
    if (!existingMessages) return null;

    try {
      const messages = JSON.parse(existingMessages).map((msg: Omit<Message, 'timestamp'> & { timestamp: string }) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));

      if (messages.length === 0) return null;

      const session = this.createSession();
      session.messages = messages;
      session.messageCount = messages.length;
      session.title = this.generateSessionTitle(messages);

      // Calculate stats
      const stats = messages.reduce((acc: { totalTokens: number; totalCost: number }, msg: Message) => {
        if (msg.type === 'assistant' && msg.tokenUsage) {
          return {
            totalTokens: acc.totalTokens + msg.tokenUsage.totalTokens,
            totalCost: acc.totalCost + msg.tokenUsage.cost.totalCost
          };
        }
        return acc;
      }, { totalTokens: 0, totalCost: 0 });

      session.totalTokens = stats.totalTokens;
      session.totalCost = stats.totalCost;
      session.createdAt = messages[0].timestamp;
      session.updatedAt = messages[messages.length - 1].timestamp;

      // Save as first session
      this.saveSessions([session]);
      this.setCurrentSession(session.id);

      // Remove old storage
      localStorage.removeItem('fashion-assistant-messages');

      return session;
    } catch (error) {
      console.error('Failed to migrate existing conversation:', error);
      return null;
    }
  }
}
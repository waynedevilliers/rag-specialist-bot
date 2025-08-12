// Conversation session management utilities
import { DocumentSource } from './rag-system';
import { DateUtils, ContextualDateFormatter } from './date-utils';

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
        .sort((a, b) => DateUtils.diffInMs(a.updatedAt, b.updatedAt))
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
      id: DateUtils.createSessionId(),
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
  static async exportSession(sessionId: string, format: 'json' | 'csv' | 'pdf'): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) return;

    const timestamp = DateUtils.nowDateString();
    const filename = `ellu-fashion-assistant-${session.id}-${timestamp}`;

    if (format === 'json') {
      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          createdAt: ContextualDateFormatter.forAPI(session.createdAt),
          updatedAt: ContextualDateFormatter.forAPI(session.updatedAt),
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
          timestamp: ContextualDateFormatter.forAPI(msg.timestamp),
          sources: msg.sources,
          processingTime: msg.processingTime,
          tokenUsage: msg.tokenUsage
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      this.downloadBlob(blob, `${filename}.json`);
    }

    else if (format === 'csv') {
      // Create CSV content
      const csvHeader = 'Timestamp,Type,Content,Sources,Processing Time (ms),Total Tokens,Total Cost ($)\n';
      const csvRows = session.messages.map(msg => {
        const content = `"${msg.content.replace(/"/g, '""')}"`;
        const sources = msg.sources ? `"${msg.sources.map(s => s.title).join('; ')}"` : '""';
        const processingTime = msg.processingTime || 0;
        const tokens = msg.tokenUsage?.totalTokens || 0;
        const cost = msg.tokenUsage?.cost.totalCost || 0;
        
        return `${ContextualDateFormatter.forAPI(msg.timestamp)},${msg.type},${content},${sources},${processingTime},${tokens},${cost.toFixed(4)}`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      this.downloadBlob(blob, `${filename}.csv`);
    }

    else if (format === 'pdf') {
      await this.exportToPDF(session, filename);
    }
  }

  // Helper method to download blob files
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export conversation to PDF
  private static async exportToPDF(session: ConversationSession, filename: string): Promise<void> {
    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      let yPosition = margin;
      const lineHeight = 6;
      const messageSpacing = 10;

      // Header
      doc.setFontSize(18);
      doc.text('ELLU Studios Fashion Assistant', margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.text(`Conversation: ${session.title}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Created: ${session.createdAt.toLocaleDateString()}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Messages: ${session.messageCount} | Tokens: ${session.totalTokens} | Cost: $${session.totalCost.toFixed(4)}`, margin, yPosition);
      yPosition += 15;

      // Messages
      doc.setFontSize(10);
      
      for (const message of session.messages) {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        // Message header
        const timeStr = message.timestamp.toLocaleString();
        const headerText = `[${timeStr}] ${message.type === 'user' ? 'Student' : 'Fashion Assistant'}:`;
        
        doc.setFont('helvetica', message.type === 'user' ? 'normal' : 'bold');
        doc.text(headerText, margin, yPosition);
        yPosition += lineHeight + 2;

        // Message content - split long text
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(message.content, maxWidth);
        
        for (const line of contentLines) {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 5, yPosition);
          yPosition += lineHeight;
        }

        // Sources if available
        if (message.sources && message.sources.length > 0) {
          yPosition += 3;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          const sourcesText = `Sources: ${message.sources.map(s => s.title).join(', ')}`;
          const sourceLines = doc.splitTextToSize(sourcesText, maxWidth - 10);
          
          for (const line of sourceLines) {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin + 10, yPosition);
            yPosition += 5;
          }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
        }

        yPosition += messageSpacing;
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 40, pageHeight - 10);
        doc.text('Generated by ELLU Studios Fashion Assistant', margin, pageHeight - 10);
      }

      // Save the PDF
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw new Error('PDF export failed');
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
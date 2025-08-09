/**
 * @jest-environment jsdom
 */
import { ConversationManager, type ConversationSession } from '../conversation-manager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ConversationManager', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('createSession', () => {
    it('should create a new session with correct initial values', () => {
      const session = ConversationManager.createSession('en');
      
      expect(session).toMatchObject({
        title: expect.stringContaining('Conversation'),
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        messages: [],
        language: 'en'
      });
      expect(session.id).toMatch(/^session_\d+$/);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should create session with German language', () => {
      const session = ConversationManager.createSession('de');
      expect(session.language).toBe('de');
    });
  });

  describe('getSessions', () => {
    it('should return empty array when no sessions stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const sessions = ConversationManager.getSessions();
      expect(sessions).toEqual([]);
    });

    it('should return parsed sessions from localStorage', () => {
      const mockSessions = [
        {
          id: 'session_1',
          title: 'Test Session',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          messageCount: 1,
          totalTokens: 100,
          totalCost: 0.01,
          messages: [],
          language: 'en'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessions));
      const sessions = ConversationManager.getSessions();
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].createdAt).toBeInstanceOf(Date);
      expect(sessions[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getStats', () => {
    it('should return empty stats when no sessions exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const stats = ConversationManager.getStats();
      
      expect(stats).toEqual({
        totalSessions: 0,
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        averageMessagesPerSession: 0,
        mostActiveDay: 'No data'
      });
    });

    it('should calculate correct stats from sessions', () => {
      const mockSessions = [
        {
          id: 'session_1',
          title: 'Test Session 1',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          messageCount: 5,
          totalTokens: 1000,
          totalCost: 0.05,
          messages: [],
          language: 'en'
        },
        {
          id: 'session_2',
          title: 'Test Session 2',
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          messageCount: 3,
          totalTokens: 500,
          totalCost: 0.03,
          messages: [],
          language: 'de'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessions));
      const stats = ConversationManager.getStats();
      
      expect(stats).toEqual({
        totalSessions: 2,
        totalMessages: 8,
        totalTokens: 1500,
        totalCost: 0.08,
        averageMessagesPerSession: 4,
        mostActiveDay: expect.any(String)
      });
    });

    it('should handle sessions with zero messages', () => {
      const mockSessions = [
        {
          id: 'session_1',
          title: 'Empty Session',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          messageCount: 0,
          totalTokens: 0,
          totalCost: 0,
          messages: [],
          language: 'en'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessions));
      const stats = ConversationManager.getStats();
      
      expect(stats.totalSessions).toBe(1);
      expect(stats.totalMessages).toBe(0);
      expect(stats.averageMessagesPerSession).toBe(0);
    });
  });

  describe('saveSessions', () => {
    it('should save sessions to localStorage', () => {
      const sessions: ConversationSession[] = [
        ConversationManager.createSession('en')
      ];
      
      ConversationManager.saveSessions(sessions);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fashion-assistant-sessions',
        expect.stringContaining('session_')
      );
    });

    it('should limit sessions to MAX_SESSIONS', () => {
      // Create more than MAX_SESSIONS (10)
      const sessions: ConversationSession[] = Array.from({ length: 12 }, (_, i) => ({
        ...ConversationManager.createSession('en'),
        id: `session_${i}`,
        updatedAt: new Date(2025, 0, i + 1) // Different dates for sorting
      }));
      
      ConversationManager.saveSessions(sessions);
      
      const savedData = JSON.parse((localStorageMock.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(10); // Should be limited to MAX_SESSIONS
    });
  });

  describe('session management', () => {
    it('should set and get current session ID', () => {
      ConversationManager.setCurrentSession('test-session-id');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fashion-assistant-current-session',
        'test-session-id'
      );
    });

    it('should get current session ID', () => {
      localStorageMock.getItem.mockReturnValue('test-session-id');
      const sessionId = ConversationManager.getCurrentSessionId();
      expect(sessionId).toBe('test-session-id');
    });
  });
});
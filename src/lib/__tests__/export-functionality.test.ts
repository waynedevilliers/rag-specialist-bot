/**
 * @jest-environment jsdom
 */
import { ConversationManager, type ConversationSession, type Message } from '../conversation-manager';

// Mock jsPDF
const mockAddPage = jest.fn();
const mockText = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetFont = jest.fn();
const mockSplitTextToSize = jest.fn();
const mockSave = jest.fn();
const mockGetNumberOfPages = jest.fn();
const mockSetPage = jest.fn();

const mockJsPDF = {
  addPage: mockAddPage,
  text: mockText,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  splitTextToSize: mockSplitTextToSize,
  save: mockSave,
  getNumberOfPages: mockGetNumberOfPages,
  setPage: mockSetPage,
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297
    }
  }
};

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => mockJsPDF)
}));

// Mock URL and document methods
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

const mockDownloadLink = {
  href: '',
  download: '',
  click: jest.fn(),
  remove: jest.fn()
};

jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'a') {
    return mockDownloadLink as any;
  }
  return document.createElement(tagName);
});

jest.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
jest.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Export Functionality', () => {
  const mockSession: ConversationSession = {
    id: 'test-session-1',
    title: 'Pattern Making Discussion',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:30:00Z'),
    messageCount: 3,
    totalTokens: 150,
    totalCost: 0.05,
    language: 'en',
    messages: [
      {
        id: 'msg-1',
        type: 'user',
        content: 'How do I create a basic bodice pattern?',
        timestamp: new Date('2025-01-01T10:00:00Z')
      },
      {
        id: 'msg-2',
        type: 'assistant',
        content: 'To create a basic bodice pattern, you\'ll need to start with taking accurate measurements...',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        sources: [
          { title: 'Course 101: Classical Pattern Construction', content: 'pattern content', relevanceScore: 0.95 }
        ],
        processingTime: 2500,
        tokenUsage: {
          promptTokens: 25,
          completionTokens: 75,
          totalTokens: 100,
          cost: {
            promptCost: 0.001,
            completionCost: 0.002,
            embeddingCost: 0.0005,
            totalCost: 0.0035
          }
        }
      },
      {
        id: 'msg-3',
        type: 'user',
        content: 'What about dart placement?',
        timestamp: new Date('2025-01-01T10:05:00Z')
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(JSON.stringify([mockSession]));
    
    // Reset jsPDF mocks
    mockSplitTextToSize.mockReturnValue(['Single line']);
    mockGetNumberOfPages.mockReturnValue(1);
  });

  describe('JSON Export', () => {
    it('should export session as JSON with correct structure', async () => {
      await ConversationManager.exportSession('test-session-1', 'json');

      expect(mockDownloadLink.download).toContain('ellu-fashion-assistant-test-session-1-');
      expect(mockDownloadLink.download).toContain('.json');
      expect(mockDownloadLink.click).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should include all session metadata in JSON export', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'json');

      const blobCall = mockBlob.mock.calls[0];
      const exportData = JSON.parse(blobCall[0][0]);

      expect(exportData.session).toMatchObject({
        id: 'test-session-1',
        title: 'Pattern Making Discussion',
        language: 'en'
      });

      expect(exportData.stats).toMatchObject({
        messageCount: 3,
        totalTokens: 150,
        totalCost: 0.05
      });

      expect(exportData.messages).toHaveLength(3);
      expect(exportData.messages[0]).toMatchObject({
        id: 'msg-1',
        type: 'user',
        content: 'How do I create a basic bodice pattern?'
      });
    });

    it('should handle sessions with token usage in JSON export', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'json');

      const blobCall = mockBlob.mock.calls[0];
      const exportData = JSON.parse(blobCall[0][0]);

      const assistantMessage = exportData.messages.find((m: any) => m.type === 'assistant');
      expect(assistantMessage.tokenUsage).toMatchObject({
        promptTokens: 25,
        completionTokens: 75,
        totalTokens: 100,
        cost: {
          totalCost: 0.0035
        }
      });
    });
  });

  describe('CSV Export', () => {
    it('should export session as CSV with correct format', async () => {
      await ConversationManager.exportSession('test-session-1', 'csv');

      expect(mockDownloadLink.download).toContain('.csv');
      expect(mockDownloadLink.click).toHaveBeenCalled();
    });

    it('should include CSV headers and data', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'csv');

      const blobCall = mockBlob.mock.calls[0];
      const csvContent = blobCall[0][0];

      expect(csvContent).toContain('Timestamp,Type,Content,Sources,Processing Time (ms),Total Tokens,Total Cost ($)');
      expect(csvContent).toContain('user,"How do I create a basic bodice pattern?"');
      expect(csvContent).toContain('assistant,"To create a basic bodice pattern');
      expect(csvContent).toContain('"Course 101: Classical Pattern Construction"');
      expect(csvContent).toContain('2500,100,0.0035');
    });

    it('should handle quotes in CSV content correctly', async () => {
      const sessionWithQuotes = {
        ...mockSession,
        messages: [{
          id: 'msg-1',
          type: 'user' as const,
          content: 'What is a "dart" in pattern making?',
          timestamp: new Date('2025-01-01T10:00:00Z')
        }]
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([sessionWithQuotes]));
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'csv');

      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toContain('""dart""'); // Quotes should be escaped
    });

    it('should handle messages without sources or token usage', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'csv');

      const csvContent = mockBlob.mock.calls[0][0][0];
      const lines = csvContent.split('\n');
      
      // User messages should have empty sources and zero tokens/cost
      const userMessageLine = lines.find((line: string) => line.includes('How do I create'));
      expect(userMessageLine).toContain('"",0,0,0.0000'); // empty sources, zero stats
    });
  });

  describe('PDF Export', () => {
    it('should export session as PDF', async () => {
      await ConversationManager.exportSession('test-session-1', 'pdf');

      expect(mockSetFontSize).toHaveBeenCalled();
      expect(mockText).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('.pdf'));
    });

    it('should include session header information in PDF', async () => {
      await ConversationManager.exportSession('test-session-1', 'pdf');

      const textCalls = mockText.mock.calls.map(call => call[0]);
      expect(textCalls).toContain('ELLU Studios Fashion Assistant');
      expect(textCalls).toContain('Conversation: Pattern Making Discussion');
      expect(textCalls.some((text: string) => text.includes('Messages: 3'))).toBe(true);
      expect(textCalls.some((text: string) => text.includes('Tokens: 150'))).toBe(true);
      expect(textCalls.some((text: string) => text.includes('Cost: $0.0500'))).toBe(true);
    });

    it('should format messages correctly in PDF', async () => {
      await ConversationManager.exportSession('test-session-1', 'pdf');

      const textCalls = mockText.mock.calls.map(call => call[0]);
      expect(textCalls.some((text: string) => text.includes('[') && text.includes('Student:'))).toBe(true);
      expect(textCalls.some((text: string) => text.includes('[') && text.includes('Fashion Assistant:'))).toBe(true);
    });

    it('should handle long text with page breaks', async () => {
      // Mock long text that would require splitting
      mockSplitTextToSize.mockReturnValue(['Line 1', 'Line 2', 'Line 3']);

      await ConversationManager.exportSession('test-session-1', 'pdf');

      expect(mockSplitTextToSize).toHaveBeenCalled();
      expect(mockText).toHaveBeenCalledWith('Line 1', expect.any(Number), expect.any(Number));
      expect(mockText).toHaveBeenCalledWith('Line 2', expect.any(Number), expect.any(Number));
    });

    it('should include sources in PDF when available', async () => {
      await ConversationManager.exportSession('test-session-1', 'pdf');

      const textCalls = mockText.mock.calls.map(call => call[0]);
      expect(textCalls.some((text: string) => 
        text.includes('Sources:') && text.includes('Course 101: Classical Pattern Construction')
      )).toBe(true);
    });

    it('should add page numbers and footer', async () => {
      mockGetNumberOfPages.mockReturnValue(2);

      await ConversationManager.exportSession('test-session-1', 'pdf');

      expect(mockSetPage).toHaveBeenCalledWith(1);
      expect(mockSetPage).toHaveBeenCalledWith(2);
      
      const textCalls = mockText.mock.calls.map(call => call[0]);
      expect(textCalls.some((text: string) => text.includes('Page 1 of 2'))).toBe(true);
      expect(textCalls.some((text: string) => text.includes('Generated by ELLU Studios'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing session gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      // Should not throw error
      await expect(ConversationManager.exportSession('nonexistent', 'json')).resolves.toBeUndefined();
      
      expect(mockDownloadLink.click).not.toHaveBeenCalled();
    });

    it('should handle PDF export errors', async () => {
      mockSave.mockImplementationOnce(() => {
        throw new Error('PDF generation failed');
      });

      await expect(ConversationManager.exportSession('test-session-1', 'pdf'))
        .rejects.toThrow('PDF export failed');
    });

    it('should handle jsPDF import errors', async () => {
      // Mock dynamic import failure
      jest.doMock('jspdf', () => {
        throw new Error('jsPDF not found');
      });

      await expect(ConversationManager.exportSession('test-session-1', 'pdf'))
        .rejects.toThrow();
    });
  });

  describe('File Naming', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should generate correct filename with date stamp', async () => {
      await ConversationManager.exportSession('test-session-1', 'json');

      expect(mockDownloadLink.download).toBe('ellu-fashion-assistant-test-session-1-2025-01-15.json');
    });

    it('should use different extensions for different formats', async () => {
      await ConversationManager.exportSession('test-session-1', 'csv');
      expect(mockDownloadLink.download).toContain('.csv');

      jest.clearAllMocks();

      await ConversationManager.exportSession('test-session-1', 'pdf');
      expect(mockSave).toHaveBeenCalledWith('ellu-fashion-assistant-test-session-1-2025-01-15.pdf');
    });
  });

  describe('Content Validation', () => {
    it('should export all message types correctly', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'json');

      const exportData = JSON.parse(mockBlob.mock.calls[0][0][0]);
      const messageTypes = exportData.messages.map((m: any) => m.type);
      
      expect(messageTypes).toContain('user');
      expect(messageTypes).toContain('assistant');
    });

    it('should preserve message timestamps in exports', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'json');

      const exportData = JSON.parse(mockBlob.mock.calls[0][0][0]);
      expect(exportData.messages[0].timestamp).toBe('2025-01-01T10:00:00.000Z');
    });

    it('should handle empty message content', async () => {
      const sessionWithEmpty = {
        ...mockSession,
        messages: [{
          id: 'msg-1',
          type: 'user' as const,
          content: '',
          timestamp: new Date('2025-01-01T10:00:00Z')
        }]
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([sessionWithEmpty]));
      
      // Should not throw error
      await expect(ConversationManager.exportSession('test-session-1', 'csv')).resolves.toBeUndefined();
    });
  });

  describe('Blob Management', () => {
    it('should clean up blob URLs after download', async () => {
      await ConversationManager.exportSession('test-session-1', 'json');

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should create blob with correct MIME type', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await ConversationManager.exportSession('test-session-1', 'json');
      expect(mockBlob).toHaveBeenCalledWith(expect.any(Array), { type: 'application/json' });

      jest.clearAllMocks();

      await ConversationManager.exportSession('test-session-1', 'csv');
      expect(mockBlob).toHaveBeenCalledWith(expect.any(Array), { type: 'text/csv' });
    });
  });
});
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationHistory from '../ConversationHistory';
import { ConversationManager } from '@/lib/conversation-manager';

// Mock ConversationManager
jest.mock('@/lib/conversation-manager');
const mockConversationManager = ConversationManager as jest.Mocked<typeof ConversationManager>;

// Mock props
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  currentSessionId: 'session-1',
  onSessionSelect: jest.fn(),
  onNewSession: jest.fn(),
  language: 'en' as const
};

const mockSessions = [
  {
    id: 'session-1',
    title: 'Pattern Making Discussion',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:30:00Z'),
    messageCount: 5,
    totalTokens: 1000,
    totalCost: 0.05,
    messages: [],
    language: 'en' as const
  },
  {
    id: 'session-2',
    title: 'Draping Techniques Help',
    createdAt: new Date('2025-01-02T14:00:00Z'),
    updatedAt: new Date('2025-01-02T14:15:00Z'),
    messageCount: 3,
    totalTokens: 500,
    totalCost: 0.025,
    messages: [],
    language: 'de' as const
  }
];

const mockStats = {
  totalSessions: 2,
  totalMessages: 8,
  totalTokens: 1500,
  totalCost: 0.075,
  averageMessagesPerSession: 4,
  mostActiveDay: 'Tue Jan 01 2025'
};

describe('ConversationHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationManager.getSessions.mockReturnValue(mockSessions);
    mockConversationManager.getStats.mockReturnValue(mockStats);
    mockConversationManager.exportSession.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<ConversationHistory {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Conversation History')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('Conversation History')).toBeInTheDocument();
    });

    it('should load sessions when panel opens', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(mockConversationManager.getSessions).toHaveBeenCalled();
      expect(mockConversationManager.getStats).toHaveBeenCalled();
    });

    it('should display session list', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('Pattern Making Discussion')).toBeInTheDocument();
      expect(screen.getByText('Draping Techniques Help')).toBeInTheDocument();
    });

    it('should highlight current session', () => {
      render(<ConversationHistory {...defaultProps} />);
      const currentSession = screen.getByText('Pattern Making Discussion').closest('div');
      expect(currentSession).toHaveClass('bg-blue-100', 'border-blue-200');
    });

    it('should show German language indicator', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('DE')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should handle session selection', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const session = screen.getByText('Draping Techniques Help');
      fireEvent.click(session);
      
      expect(defaultProps.onSessionSelect).toHaveBeenCalledWith('session-2');
    });

    it('should handle new session creation', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const newSessionButton = screen.getByText('New Chat');
      fireEvent.click(newSessionButton);
      
      expect(defaultProps.onNewSession).toHaveBeenCalled();
    });

    it('should handle session deletion', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      // Click delete button (first click)
      const deleteButtons = screen.getAllByTitle('Delete session');
      fireEvent.click(deleteButtons[0]);
      
      // Should show confirmation state
      expect(screen.getByTitle('Click again to confirm')).toBeInTheDocument();
      
      // Click again to confirm
      fireEvent.click(screen.getByTitle('Click again to confirm'));
      
      expect(mockConversationManager.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should handle current session deletion', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      // Delete current session
      const deleteButtons = screen.getAllByTitle('Delete session');
      fireEvent.click(deleteButtons[0]); // First click
      fireEvent.click(screen.getByTitle('Click again to confirm')); // Confirm
      
      expect(mockConversationManager.deleteSession).toHaveBeenCalledWith('session-1');
      expect(defaultProps.onNewSession).toHaveBeenCalled(); // Should create new session
    });
  });

  describe('Export Functionality', () => {
    it('should handle session export', async () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const exportButtons = screen.getAllByTitle('Export session');
      fireEvent.click(exportButtons[0]);
      
      await waitFor(() => {
        expect(mockConversationManager.exportSession).toHaveBeenCalledWith('session-1', 'json');
      });
    });

    it('should prevent event bubbling on export click', async () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const exportButtons = screen.getAllByTitle('Export session');
      fireEvent.click(exportButtons[0]);
      
      // Should not trigger session selection
      expect(defaultProps.onSessionSelect).not.toHaveBeenCalled();
    });

    it('should prevent event bubbling on delete click', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const deleteButtons = screen.getAllByTitle('Delete session');
      fireEvent.click(deleteButtons[0]);
      
      // Should not trigger session selection
      expect(defaultProps.onSessionSelect).not.toHaveBeenCalled();
    });
  });

  describe('Stats Panel', () => {
    it('should show stats when toggle is clicked', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const statsButton = screen.getByText('Stats');
      fireEvent.click(statsButton);
      
      expect(screen.getByText('Conversation Statistics')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total sessions
      expect(screen.getByText('8')).toBeInTheDocument(); // Total messages
      expect(screen.getByText('$0.075')).toBeInTheDocument(); // Total cost
      expect(screen.getByText('4')).toBeInTheDocument(); // Average per session
    });

    it('should hide stats when toggle is clicked again', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const statsButton = screen.getByText('Stats');
      fireEvent.click(statsButton); // Show
      fireEvent.click(statsButton); // Hide
      
      expect(screen.queryByText('Conversation Statistics')).not.toBeInTheDocument();
    });

    it('should not show stats if no stats available', () => {
      mockConversationManager.getStats.mockReturnValue({
        totalSessions: 0,
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        averageMessagesPerSession: 0,
        mostActiveDay: 'No data'
      });

      render(<ConversationHistory {...defaultProps} />);
      
      const statsButton = screen.getByText('Stats');
      fireEvent.click(statsButton);
      
      expect(screen.getByText('0')).toBeInTheDocument(); // Should show zeros
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no sessions exist', () => {
      mockConversationManager.getSessions.mockReturnValue([]);
      
      render(<ConversationHistory {...defaultProps} />);
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Start your first conversation!')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    beforeAll(() => {
      // Mock current date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should show "Just now" for recent messages', () => {
      const recentSession = {
        ...mockSessions[0],
        updatedAt: new Date('2025-01-01T11:59:00Z') // 1 minute ago
      };
      mockConversationManager.getSessions.mockReturnValue([recentSession]);

      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should show hours ago for messages within 24 hours', () => {
      const hourAgoSession = {
        ...mockSessions[0],
        updatedAt: new Date('2025-01-01T10:00:00Z') // 2 hours ago
      };
      mockConversationManager.getSessions.mockReturnValue([hourAgoSession]);

      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should show days ago for messages within a week', () => {
      const dayAgoSession = {
        ...mockSessions[0],
        updatedAt: new Date('2024-12-30T12:00:00Z') // 2 days ago
      };
      mockConversationManager.getSessions.mockReturnValue([dayAgoSession]);

      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('should show full date for older messages', () => {
      const oldSession = {
        ...mockSessions[0],
        updatedAt: new Date('2024-12-01T12:00:00Z') // Over a week ago
      };
      mockConversationManager.getSessions.mockReturnValue([oldSession]);

      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('12/1/2024')).toBeInTheDocument();
    });
  });

  describe('Localization', () => {
    it('should display German interface when language is German', () => {
      render(<ConversationHistory {...defaultProps} language="de" />);
      
      expect(screen.getByText('Gesprächsverlauf')).toBeInTheDocument(); // German for "Conversation History"
      expect(screen.getByText('Neues Gespräch')).toBeInTheDocument(); // German for "New Chat"
      expect(screen.getByText('Statistik')).toBeInTheDocument(); // German for "Stats"
    });

    it('should show German stats labels', () => {
      render(<ConversationHistory {...defaultProps} language="de" />);
      
      const statsButton = screen.getByText('Statistik');
      fireEvent.click(statsButton);
      
      expect(screen.getByText('Gesprächsstatistiken')).toBeInTheDocument(); // "Conversation Statistics"
      expect(screen.getByText('Sitzungen')).toBeInTheDocument(); // "Sessions"
      expect(screen.getByText('Nachrichten')).toBeInTheDocument(); // "Messages"
    });
  });

  describe('Panel Controls', () => {
    it('should close panel when X button is clicked', () => {
      render(<ConversationHistory {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Footer', () => {
    it('should show correct conversation count', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('2 conversations saved')).toBeInTheDocument();
    });

    it('should show singular form for one conversation', () => {
      mockConversationManager.getSessions.mockReturnValue([mockSessions[0]]);
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('1 conversations saved')).toBeInTheDocument();
    });
  });

  describe('Session Metadata', () => {
    it('should display session message count', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('5 messages')).toBeInTheDocument();
      expect(screen.getByText('3 messages')).toBeInTheDocument();
    });

    it('should display session cost when greater than 0', () => {
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.getByText('$0.050')).toBeInTheDocument();
      expect(screen.getByText('$0.025')).toBeInTheDocument();
    });

    it('should not display cost when 0', () => {
      const freeSession = { ...mockSessions[0], totalCost: 0 };
      mockConversationManager.getSessions.mockReturnValue([freeSession]);
      
      render(<ConversationHistory {...defaultProps} />);
      expect(screen.queryByText('$0.000')).not.toBeInTheDocument();
    });
  });
});
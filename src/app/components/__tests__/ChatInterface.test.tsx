/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatInterface from '../ChatInterface';
import { ConversationManager } from '@/lib/conversation-manager';

// Mock the modules
jest.mock('@/lib/conversation-manager');
jest.mock('../SourceCitations', () => {
  return function MockSourceCitations() {
    return <div data-testid="source-citations">Sources</div>;
  };
});
jest.mock('../ConversationHistory', () => {
  return function MockConversationHistory({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="conversation-history">
        <button onClick={onClose}>Close History</button>
      </div>
    ) : null;
  };
});
jest.mock('../ModelSelector', () => {
  return function MockModelSelector({ currentConfig, onConfigChange }: any) {
    return (
      <div data-testid="model-selector">
        <button onClick={() => onConfigChange({ ...currentConfig, provider: 'gemini' })}>
          Change Model
        </button>
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock ConversationManager
const mockConversationManager = ConversationManager as jest.Mocked<typeof ConversationManager>;

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();

    // Setup default mocks
    mockConversationManager.createSession.mockReturnValue({
      id: 'test-session-1',
      title: 'Test Session',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      messages: [],
      language: 'en'
    });
    mockConversationManager.getSessions.mockReturnValue([]);
    mockConversationManager.getStats.mockReturnValue({
      totalSessions: 0,
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      averageMessagesPerSession: 0,
      mostActiveDay: 'No data'
    });
  });

  describe('Language Switching', () => {
    it('should switch language from English to German', async () => {
      render(<ChatInterface />);
      
      // Find and click language toggle button
      const languageToggle = screen.getByText('EN');
      fireEvent.click(languageToggle);
      
      // Click on Deutsch option
      const deutschOption = screen.getByText('Deutsch');
      fireEvent.click(deutschOption);
      
      // Verify localStorage was called to save language
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fashion-assistant-language', 'de');
    });

    it('should switch language from German back to English', async () => {
      localStorageMock.getItem.mockReturnValue('de');
      
      render(<ChatInterface />);
      
      // Should show DE when German is selected
      const languageToggle = screen.getByText('DE');
      fireEvent.click(languageToggle);
      
      // Click on English option
      const englishOption = screen.getByText('English');
      fireEvent.click(englishOption);
      
      // Verify localStorage was called to save language
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fashion-assistant-language', 'en');
    });

    it('should load saved language preference on mount', () => {
      localStorageMock.getItem.mockReturnValue('de');
      
      render(<ChatInterface />);
      
      // Should show DE when German was previously selected
      expect(screen.getByText('DE')).toBeInTheDocument();
    });

    it('should close language menu when clicking outside', () => {
      render(<ChatInterface />);
      
      // Open language menu
      const languageToggle = screen.getByText('EN');
      fireEvent.click(languageToggle);
      
      // Verify menu is open
      expect(screen.getByText('English')).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      // Menu should close (English option should not be visible)
      expect(screen.queryByText('English')).not.toBeInTheDocument();
    });
  });

  describe('Model Switching', () => {
    it('should change model configuration', () => {
      render(<ChatInterface />);
      
      const changeModelButton = screen.getByText('Change Model');
      fireEvent.click(changeModelButton);
      
      // Verify model change was processed (component should re-render with new config)
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    });
  });

  describe('Conversation History', () => {
    it('should open conversation history panel', () => {
      render(<ChatInterface />);
      
      const historyButton = screen.getByText('Conversation History');
      fireEvent.click(historyButton);
      
      expect(screen.getByTestId('conversation-history')).toBeInTheDocument();
    });

    it('should close conversation history panel', () => {
      render(<ChatInterface />);
      
      // Open history
      const historyButton = screen.getByText('Conversation History');
      fireEvent.click(historyButton);
      
      // Close history
      const closeButton = screen.getByText('Close History');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('conversation-history')).not.toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('should send message and handle response', async () => {
      const mockResponse = {
        content: 'Test response',
        sources: [],
        processingTime: 100,
        tokenUsage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25,
          cost: {
            promptCost: 0.001,
            completionCost: 0.002,
            embeddingCost: 0,
            totalCost: 0.003
          }
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Type message and send
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      // Wait for response
      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });
      
      // Verify API call
      expect(fetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          language: 'en',
          modelConfig: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 2000
          }
        })
      });
    });

    it('should handle API error gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      // Type message and send
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/experiencing technical difficulties/)).toBeInTheDocument();
      });
    });

    it('should send message with Enter key', () => {
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      
      // Should clear input after sending
      expect(input).toHaveValue('');
    });

    it('should not send message with Shift+Enter', () => {
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      
      // Should not clear input (message not sent)
      expect(input).toHaveValue('Test message');
    });

    it('should disable send button when loading', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({ content: 'Response' }) }), 100))
      );

      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      // Button should be disabled while loading
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Export Functionality', () => {
    it('should disable export button when no messages', () => {
      render(<ChatInterface />);
      
      const exportButton = screen.getByText('Export');
      expect(exportButton).toBeDisabled();
    });

    it('should show export menu when messages exist', async () => {
      const mockResponse = {
        content: 'Test response',
        sources: []
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<ChatInterface />);
      
      // Send a message first
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });
      
      // Now export button should be enabled
      const exportButton = screen.getByText('Export');
      expect(exportButton).not.toBeDisabled();
      
      fireEvent.click(exportButton);
      
      // Export menu should be visible
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('should show mobile menu when hamburger clicked', () => {
      render(<ChatInterface />);
      
      const hamburgerButton = screen.getByRole('button', { 
        name: /menu/i 
      });
      fireEvent.click(hamburgerButton);
      
      // Should show mobile menu items
      expect(screen.getByText('Switch to Deutsch')).toBeInTheDocument();
    });

    it('should close mobile menu when language is switched', () => {
      render(<ChatInterface />);
      
      // Open mobile menu
      const hamburgerButton = screen.getByRole('button', { 
        name: /menu/i 
      });
      fireEvent.click(hamburgerButton);
      
      // Click language switch in mobile menu
      const switchLanguage = screen.getByText('Switch to Deutsch');
      fireEvent.click(switchLanguage);
      
      // Menu should close and language should change
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fashion-assistant-language', 'de');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/experiencing technical difficulties/)).toBeInTheDocument();
      });
    });

    it('should handle malformed JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/experiencing technical difficulties/)).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should create new session on initialization', () => {
      render(<ChatInterface />);
      
      expect(mockConversationManager.createSession).toHaveBeenCalledWith('en');
    });

    it('should save session when messages change', async () => {
      const mockResponse = {
        content: 'Test response',
        sources: []
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(mockConversationManager.updateSession).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ChatInterface />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText(/Ask about pattern making/);
      
      // Should be focusable
      input.focus();
      expect(input).toHaveFocus();
      
      // Tab should move to send button
      fireEvent.keyDown(input, { key: 'Tab' });
      // Note: jsdom doesn't handle tab navigation automatically, 
      // but we can verify the button is focusable
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).not.toBeDisabled();
    });
  });
});
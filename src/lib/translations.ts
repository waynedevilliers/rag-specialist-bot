// Simple translation replacement for ChatInterface
export type Language = 'en' | 'de';

const translations = {
  en: {
    appTitle: 'ELLU Fashion Design Assistant',
    appDescription: 'AI-powered assistant for fashion design education',
    sessionStats: 'Session: {{messages}} messages, {{tokens}} tokens',
    conversationHistory: 'Conversation History',
    exportButton: 'Export',
    exportAsJSON: 'Export as JSON',
    exportAsCSV: 'Export as CSV',
    exportAsPDF: 'Export as PDF',
    clearConversation: 'Clear Conversation',
    processing: 'Processing...',
    inputPlaceholder: 'Ask about fashion design, pattern construction, or draping...',
    keyboardHint: 'Press Enter to send, Shift+Enter for new line',
    welcomeMessage: 'Hello! I\'m ELLU, your fashion design assistant. I can help you with pattern construction, draping techniques, and Adobe Illustrator for fashion. What would you like to learn today?',
    tokens: 'Tokens',
    cost: 'Cost',
    prompt: 'Prompt',
    completion: 'Completion',
    embedding: 'Embedding',
    totalCost: 'Total Cost'
  },
  de: {
    appTitle: 'ELLU Modedesign Assistent',
    appDescription: 'KI-gestützter Assistent für Modedesign-Ausbildung',
    sessionStats: 'Sitzung: {{messages}} Nachrichten, {{tokens}} Token',
    conversationHistory: 'Gesprächsverlauf',
    exportButton: 'Exportieren',
    exportAsJSON: 'Als JSON exportieren',
    exportAsCSV: 'Als CSV exportieren',
    exportAsPDF: 'Als PDF exportieren',
    clearConversation: 'Gespräch löschen',
    processing: 'Verarbeitung...',
    inputPlaceholder: 'Fragen Sie nach Modedesign, Schnittkonstruktion oder Drapieren...',
    keyboardHint: 'Enter zum Senden, Shift+Enter für neue Zeile',
    welcomeMessage: 'Hallo! Ich bin ELLU, Ihr Modedesign-Assistent. Ich kann Ihnen bei Schnittkonstruktion, Drapier-Techniken und Adobe Illustrator für Mode helfen. Was möchten Sie heute lernen?',
    tokens: 'Token',
    cost: 'Kosten',
    prompt: 'Eingabe',
    completion: 'Ausgabe',
    embedding: 'Embedding',
    totalCost: 'Gesamtkosten'
  }
};

export function t(key: string, language: Language, params?: Record<string, any>): string {
  let text = translations[language][key as keyof typeof translations[Language]] || key;

  if (params) {
    Object.keys(params).forEach(param => {
      text = text.replace(`{{${param}}}`, params[param]);
    });
  }

  return text;
}
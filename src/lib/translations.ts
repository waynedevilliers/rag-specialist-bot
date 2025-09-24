export type Language = 'en' | 'de';

export interface Translations {
  // Header
  appTitle: string;
  appDescription: string;
  sessionStats: string;
  
  // Welcome message
  welcomeMessage: string;
  
  // Chat interface
  inputPlaceholder: string;
  sendButton: string;
  keyboardHint: string;
  processing: string;
  
  // Export menu
  exportButton: string;
  exportAsJSON: string;
  exportAsCSV: string;
  exportAsPDF: string;
  clearConversation: string;
  
  // Token usage
  tokens: string;
  cost: string;
  prompt: string;
  completion: string;
  embedding: string;
  totalCost: string;
  
  // Error messages
  errorMessage: string;
  tryAgain: string;
  
  // Course names
  course101: string;
  course201: string;
  course301: string;
  
  // Language toggle
  language: string;
  switchToGerman: string;
  switchToEnglish: string;
  
  // Conversation history
  conversationHistory: string;
  newConversation: string;
  stats: string;
  conversationStats: string; 
  sessions: string;
  messages: string;
  avgPerSession: string;
  noConversations: string;
  startFirstConversation: string;
  exportSession: string;
  deleteSession: string;
  confirmDelete: string;
  conversationsSaved: string;
  justNow: string;
  hoursAgo: string;
  daysAgo: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Header
    appTitle: "ELLU",
    appDescription: "Your intelligent fashion design companion",
    sessionStats: "Session: {messages} msgs • {tokens} tokens • ${cost}",

    // Welcome message
    welcomeMessage: `Hello! I'm ELLU, your intelligent fashion design assistant from ELLU Studios. I'm here to help you master fashion design through:

• Classical Pattern Construction (Course 101)
• Draping Techniques (Course 201)
• Onlinekurs – Adobe Illustrator lernen (Course 301)
  - Technische Modezeichnung – Grundlagen
  - Teil 1: Werkzeuge & Ebenen arbeiten
  - Teil 2: Formatieren, Schablone, Vorder-/Rückansicht
  - Teil 3: Beschriften & Zusammenfassung

I can calculate fabric requirements, provide step-by-step tutorials, and guide you through any creative challenges. What would you like to create today?`,
    
    // Chat interface
    inputPlaceholder: "Ask about pattern making, draping, Illustrator techniques, or any course content...",
    sendButton: "Send",
    keyboardHint: "Press Enter to send, Shift+Enter for new line",
    processing: "Searching documentation and generating response...",
    
    // Export menu
    exportButton: "Export",
    exportAsJSON: "Export as JSON",
    exportAsCSV: "Export as CSV",
    exportAsPDF: "Export as PDF",
    clearConversation: "Clear Conversation",
    
    // Token usage
    tokens: "Tokens",
    cost: "Cost",
    prompt: "Prompt",
    completion: "Completion",
    embedding: "Embedding",
    totalCost: "Total Cost",
    
    // Error messages
    errorMessage: "I'm experiencing technical difficulties. Please check your connection and try again.",
    tryAgain: "Please try again.",
    
    // Course names
    course101: "Classical Pattern Construction (Course 101)",
    course201: "Draping Techniques (Course 201)",
    course301: "Onlinekurs – Adobe Illustrator lernen (Course 301)",
    
    // Language toggle
    language: "Language",
    switchToGerman: "Deutsch",
    switchToEnglish: "English",
    
    // Conversation history
    conversationHistory: "Conversation History",
    newConversation: "New Chat",
    stats: "Stats",
    conversationStats: "Conversation Statistics",
    sessions: "sessions",
    messages: "messages",
    avgPerSession: "avg/session",
    noConversations: "No conversations yet",
    startFirstConversation: "Start your first conversation!",
    exportSession: "Export session",
    deleteSession: "Delete session",
    confirmDelete: "Click again to confirm",
    conversationsSaved: "{count} conversations saved",
    justNow: "Just now",
    hoursAgo: "{hours}h ago",
    daysAgo: "{days}d ago"
  },
  
  de: {
    // Header
    appTitle: "ELLU",
    appDescription: "Ihr intelligenter Modedesign-Begleiter",
    sessionStats: "Sitzung: {messages} Nachr. • {tokens} Tokens • ${cost}",

    // Welcome message
    welcomeMessage: `Hallo! Ich bin ELLU, Ihr intelligenter Modedesign-Assistent von ELLU Studios. Ich helfe Ihnen dabei, Modedesign zu meistern durch:

• Klassische Schnittmuster-Konstruktion (Kurs 101)
• Drapier-Techniken (Kurs 201)
• Onlinekurs – Adobe Illustrator lernen (Kurs 301)
  - Technische Modezeichnung – Grundlagen
  - Teil 1: Werkzeuge & mit Ebenen arbeiten
  - Teil 2: Formatieren, Schablone, Vorder-/Rückansicht
  - Teil 3: Beschriften & Zusammenfassung

Ich kann Stoffberechnungen durchführen, Schritt-für-Schritt Anleitungen geben und Sie bei kreativen Herausforderungen unterstützen. Was möchten Sie heute kreieren?`,
    
    // Chat interface
    inputPlaceholder: "Fragen Sie nach klassischer Schnittmuster-Konstruktion, Drapieren, Illustrator-Techniken oder anderen Kursinhalten...",
    sendButton: "Senden",
    keyboardHint: "Enter zum Senden, Shift+Enter für neue Zeile",
    processing: "Durchsuche Dokumentation und generiere Antwort...",
    
    // Export menu
    exportButton: "Exportieren",
    exportAsJSON: "Als JSON exportieren",
    exportAsCSV: "Als CSV exportieren",
    exportAsPDF: "Als PDF exportieren",
    clearConversation: "Unterhaltung löschen",
    
    // Token usage
    tokens: "Tokens",
    cost: "Kosten",
    prompt: "Eingabe",
    completion: "Vervollständigung",
    embedding: "Einbettung",
    totalCost: "Gesamtkosten",
    
    // Error messages
    errorMessage: "Ich habe technische Schwierigkeiten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    tryAgain: "Bitte versuchen Sie es erneut.",
    
    // Course names
    course101: "Klassische Schnittmuster-Konstruktion (Kurs 101)",
    course201: "Drapier-Techniken (Kurs 201)",
    course301: "Onlinekurs – Adobe Illustrator lernen (Kurs 301)",
    
    // Language toggle
    language: "Sprache",
    switchToGerman: "Deutsch",
    switchToEnglish: "English",
    
    // Conversation history
    conversationHistory: "Gesprächsverlauf",
    newConversation: "Neues Gespräch",
    stats: "Statistik",
    conversationStats: "Gesprächsstatistiken",
    sessions: "Sitzungen",
    messages: "Nachrichten",
    avgPerSession: "Ø/Sitzung",
    noConversations: "Noch keine Gespräche",
    startFirstConversation: "Beginnen Sie Ihr erstes Gespräch!",
    exportSession: "Sitzung exportieren",
    deleteSession: "Sitzung löschen",
    confirmDelete: "Klicken Sie erneut zur Bestätigung",
    conversationsSaved: "{count} Gespräche gespeichert",
    justNow: "Gerade eben",
    hoursAgo: "vor {hours}h",
    daysAgo: "vor {days}T"
  }
};

// Helper function to interpolate variables in translation strings
export function t(key: keyof Translations, language: Language, variables?: Record<string, string | number>): string {
  let translation = translations[language][key] as string;
  
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      translation = translation.replace(`{${key}}`, String(value));
    });
  }
  
  return translation;
}
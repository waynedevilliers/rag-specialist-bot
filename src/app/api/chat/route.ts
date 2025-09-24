import { NextRequest, NextResponse } from "next/server";
import { ragSystem } from "@/lib/rag-system";

// Helper function to detect simple greetings
function isSimpleGreeting(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  
  const greetingPatterns = [
    // English greetings
    /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)$/,
    /^(hi|hello|hey)\s*!*$/,
    /^good\s+(morning|afternoon|evening|day)\s*!*$/,
    
    // German greetings
    /^(hallo|hi|hey|guten\s+morgen|guten\s+tag|guten\s+abend)$/,
    /^(hallo|hi|hey)\s*!*$/,
    /^guten\s+(morgen|tag|abend)\s*!*$/,
    
    // Common variations
    /^(howdy|greetings|salutations)\s*!*$/,
    /^(moin|servus|ciao)\s*!*$/,
  ];
  
  return greetingPatterns.some(pattern => pattern.test(normalizedMessage));
}

// Helper function to generate appropriate greeting responses
function generateGreetingResponse(language: 'en' | 'de'): string {
  const responses = {
    en: [
      "Hello! I'm ELLU, your intelligent fashion design assistant from ELLU Studios. I'm here to help with pattern making, Adobe Illustrator, draping techniques, fabric calculations, and construction guidance. What would you like to learn about today?",
      "Hi there! I'm ELLU, ready to help you with your fashion design journey. I can assist with course content, provide step-by-step tutorials, calculate fabric requirements, and guide you through any challenges. What's on your mind?",
      "Good day! I'm ELLU, your dedicated fashion design companion. Whether you need help with specific techniques, measurements, or have questions about course materials, I'm here to help make your creative vision come to life!"
    ],
    de: [
      "Hallo! Ich bin ELLU, Ihr intelligenter Modedesign-Assistent von ELLU Studios. Ich helfe bei Schnittmuster-Erstellung, Adobe Illustrator, Drapier-Techniken, Stoffberechnungen und Konstruktions-Anleitungen. Womit kann ich Ihnen heute helfen?",
      "Hi! Ich bin ELLU und freue mich, Ihnen bei Ihrer Modedesign-Reise zu helfen. Ich kann bei Kursinhalten assistieren, Schritt-für-Schritt Anleitungen geben und Sie durch Herausforderungen führen. Was beschäftigt Sie?",
      "Guten Tag! Ich bin ELLU, Ihr persönlicher Modedesign-Begleiter. Ob Sie Hilfe bei bestimmten Techniken, Messungen oder Fragen zu Kursmaterialien haben - ich bin da, um Ihre kreative Vision zum Leben zu erwecken!"
    ]
  };
  
  const responseList = responses[language];
  return responseList[Math.floor(Math.random() * responseList.length)];
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { message, language = 'auto', modelConfig, conversationHistory = [], sessionId, currentVideoModule } = await req.json();

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate language
    if (!['en', 'de', 'auto'].includes(language)) {
      return NextResponse.json(
        { error: "Language must be 'en', 'de', or 'auto'" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long. Please limit to 2000 characters." },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 401 }
      );
    }

    // Check for simple greetings and respond without RAG
    const isGreeting = isSimpleGreeting(message);
    if (isGreeting) {
      const greetingResponse = generateGreetingResponse(language);
      return NextResponse.json({
        content: greetingResponse,
        sources: [],
        timestamp: new Date().toISOString(),
        processingTime: 5, // Minimal processing time
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          embeddingTokens: 0,
          cost: { promptCost: 0, completionCost: 0, embeddingCost: 0, totalCost: 0 }
        },
      });
    }

    // Use RAG system for enhanced responses with conversation context
    const ragResponse = await ragSystem.query(message, language, modelConfig, {
      conversationHistory,
      sessionId,
      currentVideoModule
    });

    // Return the response with sources and token usage
    return NextResponse.json({
      content: ragResponse.content,
      sources: ragResponse.sources,
      timestamp: new Date().toISOString(),
      processingTime: ragResponse.processingTime,
      tokenUsage: ragResponse.tokenUsage,
    });

  } catch (error) {
    console.error("Chat API error:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "Invalid API key configuration", details: error.message },
          { status: 401 }
        );
      }
      
      if (error.message.includes("rate limit") || error.message.includes("quota")) {
        return NextResponse.json(
          { error: "API rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timeout. Please try again." },
          { status: 408 }
        );
      }

      // Return the actual error message in development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { error: "Development error", details: error.message },
          { status: 500 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
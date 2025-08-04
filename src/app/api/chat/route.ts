import { NextRequest, NextResponse } from "next/server";
import { ragSystem } from "@/lib/rag-system";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { message, language = 'en', modelConfig } = await req.json();

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate language
    if (!['en', 'de'].includes(language)) {
      return NextResponse.json(
        { error: "Language must be 'en' or 'de'" },
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

    // Use RAG system for enhanced responses
    const ragResponse = await ragSystem.query(message, language, modelConfig);

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
      stack: error instanceof Error ? error.stack : undefined,
      modelConfig
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
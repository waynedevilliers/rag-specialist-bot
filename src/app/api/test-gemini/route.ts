import { NextRequest, NextResponse } from "next/server";
import { ModelService } from "@/lib/model-service";

export async function POST(req: NextRequest) {
  try {
    const { message = "Hello! Can you help me with fashion design?" } = await req.json();

    console.log('Testing Gemini directly...');
    
    // Test Gemini directly
    const modelService = new ModelService({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 200
    });

    const messages = [
      { role: 'system' as const, content: 'You are a helpful fashion design assistant.' },
      { role: 'user' as const, content: message }
    ];

    console.log('Calling ModelService...');
    const startTime = Date.now();
    
    const response = await modelService.generateResponse(messages);
    
    const duration = Date.now() - startTime;
    console.log(`Response received in ${duration}ms`);

    return NextResponse.json({
      success: true,
      content: response.content,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      processingTime: duration
    });

  } catch (error) {
    console.error("Test Gemini error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to test Gemini" });
}
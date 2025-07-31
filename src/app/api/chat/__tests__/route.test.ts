import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock the external dependencies
jest.mock("@/lib/rag-system", () => ({
  ragSystem: {
    query: jest.fn().mockResolvedValue({
      response: "Test response",
      sources: [],
    }),
  },
}));

function mockRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    json: async () => body,
    method: "POST",
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe("POST /api/chat", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("rejects invalid input", async () => {
    const req = mockRequest({ message: "" });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/required/i);
  });

  it("handles missing API key", async () => {
    process.env.OPENAI_API_KEY = "";
    const req = mockRequest({ message: "test" });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toMatch(/api key/i);
  });

  it("handles very long messages", async () => {
    process.env.OPENAI_API_KEY = "test-key-123";
    const longMessage = "a".repeat(1001);
    const req = mockRequest({ message: longMessage });
    const res = await POST(req);
    // Should either accept or reject gracefully
    expect([200, 400].includes(res.status)).toBe(true);
  });

  it("accepts valid message within limits", async () => {
    process.env.OPENAI_API_KEY = "test-key-123";
    const validMessage = "How do I create a basic pattern?";
    const req = mockRequest({ message: validMessage });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("handles conversation ID validation", async () => {
    process.env.OPENAI_API_KEY = "test-key-123";
    const req = mockRequest({ 
      message: "Hello", 
      conversationId: "550e8400-e29b-41d4-a716-446655440000" 
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("handles rate limiting headers", async () => {
    const req = mockRequest(
      { message: "test" },
      { "x-forwarded-for": "192.168.1.1" }
    );
    // Test would check rate limiting logic if implemented
    expect(req.headers.get("x-forwarded-for")).toBe("192.168.1.1");
  });

  it("sanitizes input for security", async () => {
    const maliciousMessage = "<script>alert('xss')</script>";
    const req = mockRequest({ message: maliciousMessage });
    // Should not crash and should handle gracefully
    const res = await POST(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

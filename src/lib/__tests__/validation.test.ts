import { z } from "zod";

const MessageSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
  functions: z.array(z.string()).optional(),
});

const FashionFunctionSchema = z.object({
  name: z.enum(["calculate_measurements", "generate_technique_guide", "illustrator_help"]),
  parameters: z.record(z.any()),
});

describe("MessageSchema", () => {
  it("accepts valid input", () => {
    expect(() =>
      MessageSchema.parse({ message: "Hello", conversationId: undefined })
    ).not.toThrow();
  });

  it("rejects empty message", () => {
    expect(() => MessageSchema.parse({ message: "" })).toThrow();
  });

  it("rejects too long message", () => {
    expect(() => MessageSchema.parse({ message: "a".repeat(1001) })).toThrow();
  });

  it("rejects invalid UUID", () => {
    expect(() =>
      MessageSchema.parse({ message: "Hi", conversationId: "not-a-uuid" })
    ).toThrow();
  });

  it("accepts valid input with functions array", () => {
    expect(() =>
      MessageSchema.parse({
        message: "Hello",
        functions: ["func1", "func2"],
      })
    ).not.toThrow();
  });

  it("accepts valid input without optional fields", () => {
    expect(() =>
      MessageSchema.parse({
        message: "Hello",
      })
    ).not.toThrow();
  });

  it("rejects functions if not an array of strings", () => {
    expect(() =>
      MessageSchema.parse({
        message: "Hello",
        functions: [123, "func2"],
      })
    ).toThrow();
  });

  it("accepts valid UUID format", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(() =>
      MessageSchema.parse({
        message: "Hello",
        conversationId: validUuid,
      })
    ).not.toThrow();
  });

  it("rejects malformed UUID", () => {
    expect(() =>
      MessageSchema.parse({
        message: "Hello",
        conversationId: "invalid-uuid-format",
      })
    ).toThrow();
  });
});

describe("FashionFunctionSchema", () => {
  it("accepts valid fashion function names", () => {
    expect(() =>
      FashionFunctionSchema.parse({
        name: "calculate_measurements",
        parameters: { garmentType: "dress", size: "12" },
      })
    ).not.toThrow();
  });

  it("rejects invalid function names", () => {
    expect(() =>
      FashionFunctionSchema.parse({
        name: "invalid_function",
        parameters: {},
      })
    ).toThrow();
  });

  it("accepts empty parameters object", () => {
    expect(() =>
      FashionFunctionSchema.parse({
        name: "illustrator_help",
        parameters: {},
      })
    ).not.toThrow();
  });
});
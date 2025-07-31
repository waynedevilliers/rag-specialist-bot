# ELLU Studios Fashion Design Assistant - Setup Guide

*Originally: RAG Specialist Bot - Technical Documentation Assistant*

## Prerequisites
- Node.js 18+ and npm
- OpenAI API key with billing configured
- VS Code (recommended)

## Project Evolution
This project demonstrates RAG system flexibility through complete domain transformation:
- **Phase 1-2**: Technical Documentation Assistant (Next.js/React)
- **Phase 3**: Fashion Design Student Assistant (ELLU Studios courses)

## Quick Start

### 1. Clone and Install Dependencies
```bash
cd rag-specialist-bot
npm install
```

### 2. Configure Environment Variables
Create/update `.env.local` with your OpenAI API key:
```env
# Required: OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: App Configuration
NEXT_PUBLIC_APP_NAME=ELLU Studios Fashion Assistant
NEXT_PUBLIC_APP_DESCRIPTION=Fashion design student support chatbot
NODE_ENV=development
```

**Getting an OpenAI API Key:**
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in `.env.local`
5. **Important:** Add billing information to your OpenAI account

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the chat interface.

### 4. Test the Fashion Design Assistant
Try these example queries:
- "How do I calculate fabric for a wrap dress?"
- "Show me how to create darts properly"
- "What's the difference between draping and flat pattern making?"
- "Help me set up Illustrator for technical flats"
- "Calculate measurements for a size 12 blouse with 3 inches of ease"

### 5. Test Function Calling
The assistant includes 3 specialized functions:
- **Measurement Calculator**: "Calculate fabric needed for a fitted skirt"
- **Technique Guide**: "Show me how to set sleeves step by step"
- **Illustrator Help**: "How do I create a textile pattern repeat?"

## Current Features (All Phases Complete)

### ✅ Phase 1: Foundation (Completed)
- **Real-time Chat**: Professional chat interface with message history
- **Error Handling**: Comprehensive error handling for API failures, network issues, rate limits
- **Input Validation**: Message length limits, required field validation
- **Loading States**: Animated loading indicators during API calls
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line

### ✅ Phase 2: Advanced RAG (Completed)
- **RAG System**: Knowledge base with 4 fashion design courses
- **Vector Search**: Semantic search through course documentation
- **Source Citations**: References with course and module attribution
- **Hybrid Search**: Combines vector similarity and text matching

### ✅ Phase 3: Domain Transformation & Function Calling (Completed)
- **Complete Domain Change**: From technical docs to fashion education
- **Student Support System**: Educational prompts and guidance
- **3 Fashion Functions**: Measurement calculator, technique guide, Illustrator help
- **Course-Aware Interface**: Fashion-themed UI with course badges

### 🎓 Current Domain: ELLU Studios Fashion Design Courses
- **Course 101**: Pattern Making Fundamentals
- **Course 201**: Adobe Illustrator for Fashion Design
- **Course 301**: Draping Techniques  
- **Course 401**: Fashion Construction Methods

## Troubleshooting

### Common Issues

**1. "Invalid API key configuration" Error**
- Ensure your OpenAI API key is correctly set in `.env.local`
- Restart the development server after adding the key
- Check that your OpenAI account has billing configured

**2. Development Server Won't Start**
- Check if port 3000 is already in use: `lsof -i :3000`
- Kill existing processes: `pkill -f "next dev"`
- Try starting on a different port: `npm run dev -- -p 3001`

**3. Dependencies Issues**
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Use legacy peer deps if conflicts: `npm install --legacy-peer-deps`

**4. Chat Not Responding**
- Check browser console for JavaScript errors
- Verify API key is correctly configured
- Check OpenAI API status at [status.openai.com](https://status.openai.com)

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Check TypeScript types (add this script if missing)
npm run typecheck

# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage analysis
npm run test:coverage
```

## Testing Setup

### Test Suite Overview
The project includes a comprehensive automated test suite with 27 passing tests covering:

- **API Route Tests**: Authentication, validation, and error handling
- **Fashion Function Tests**: Measurement calculations and technique guidance
- **Input Validation Tests**: Schema enforcement and security

### Running Tests
```bash
# Run all tests once
npm test

# Development mode with automatic re-running
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure
```
src/
├── app/api/chat/__tests__/
│   └── route.test.ts              # API endpoint testing
├── lib/__tests__/
│   ├── validation.test.ts         # Input validation testing
│   └── fashion-functions-simple.test.ts  # Function testing
└── jest.config.js                 # Jest configuration
```

### Adding New Tests
1. Create test files with `.test.ts` or `.test.tsx` extension
2. Place in `__tests__` directories alongside source files
3. Use Jest and mocking for external dependencies
4. Run `npm test` to verify new tests pass
```

## Project Structure
```
rag-specialist-bot/
├── src/app/
│   ├── api/
│   │   ├── chat/route.ts              # RAG + Function calling endpoint
│   │   └── functions/route.ts         # Fashion function execution
│   ├── components/
│   │   ├── ChatInterface.tsx          # Fashion-themed chat UI
│   │   ├── SourceCitations.tsx        # Course-aware source display
│   │   ├── MessageBubble.tsx          # Enhanced message display
│   │   └── FunctionResults.tsx        # Function result display
│   ├── page.tsx                       # Student assistant home
│   ├── layout.tsx                     # Fashion-themed layout
│   └── globals.css                    # Global styles
├── lib/
│   ├── rag-system.ts                  # Core RAG with fashion prompts
│   ├── vector-store.ts                # Vector embeddings
│   ├── knowledge-base.ts              # Fashion course management
│   └── fashion-functions.ts           # Function implementations
├── data/                              # Fashion course knowledge base
│   ├── pattern-making-fundamentals.md    # Course 101 content
│   ├── illustrator-fashion-design.md     # Course 201 content
│   ├── draping-techniques.md             # Course 301 content
│   └── fashion-construction-methods.md   # Course 401 content
├── .env.local                         # Environment variables
├── package.json                       # Dependencies
├── PROJECT_ANALYSIS.md                # Project evolution analysis
├── CLAUDE.md                          # Development memory
└── SETUP.md                           # This file
```

## API Endpoints

### POST /api/chat
**Purpose:** Main chat endpoint with RAG retrieval and function calling

**Request:**
```json
{
  "message": "How do I calculate fabric for a wrap dress?"
}
```

**Response:**
```json
{
  "content": "To calculate fabric for a wrap dress...",
  "sources": [
    {
      "title": "Pattern Making Fundamentals - Course 101",
      "section": "Fabric Calculations",
      "type": "pattern-making",
      "courseNumber": "101",
      "moduleNumber": "1.3",
      "excerpt": "For wrap dresses, calculate...",
      "relevanceScore": 0.95
    }
  ],
  "processingTime": 1250
}
```

### POST /api/functions
**Purpose:** Execute fashion-specific functions

**Request:**
```json
{
  "function": "calculate_measurements",
  "parameters": {
    "garmentType": "dress",
    "measurements": {"bust": 36, "waist": 28, "hip": 38, "length": 42},
    "ease": {"bust": 4, "waist": 2, "hip": 3}
  }
}
```

**Error Responses:**
- `400`: Invalid request (missing/invalid message)
- `401`: Invalid API key
- `408`: Request timeout
- `429`: Rate limit exceeded
- `500`: Server error

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for chat completions | `sk-...` |
| `NEXT_PUBLIC_APP_NAME` | No | App display name | `ELLU Studios Fashion Assistant` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | No | App description | `Fashion design student support chatbot` |
| `NODE_ENV` | No | Environment mode | `development` |

## Security Considerations

### Current Security Measures
- ✅ **Input Validation**: Message length limits (2000 chars)
- ✅ **Error Handling**: No sensitive information in error messages
- ✅ **API Key Protection**: Server-side only, not exposed to client
- ✅ **Request Validation**: Type checking with proper error responses

### Implemented Security Enhancements ✅
- ✅ **Function Parameter Validation**: Zod schemas for all function inputs
- ✅ **Educational Content Safety**: Curated fashion course content
- ✅ **Function Call Validation**: Type-safe function parameter handling
- ✅ **Domain-Specific Security**: Fashion education focused, no code execution

## Performance Considerations

### Current Optimizations
- Efficient React state management
- Tailwind CSS for minimal bundle size
- TypeScript for better development experience
- Error boundaries to prevent crashes

### Implemented Optimizations ✅
- ✅ **Vector Embeddings Caching**: In-memory vector storage for fast retrieval
- ✅ **Hybrid Search**: Optimized combination of semantic and text search
- ✅ **Efficient Chunking**: Smart 1000-character chunks with 200-character overlap
- ✅ **Course-Aware Filtering**: Targeted retrieval by course and module
- ✅ **Function Result Caching**: Optimized calculation and guidance functions

## Getting Help

### Technical Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [LangChain.js Documentation](https://js.langchain.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zod Validation Documentation](https://zod.dev/)

### Fashion Education Resources
- [ELLU Studios](https://ellustudios.com) - Fashion design education inspiration
- Course content covers pattern making, Adobe Illustrator, draping, and construction techniques

### Support
- Check the browser console for errors
- Review the API response in Network tab
- Ensure environment variables are correctly set
- Verify OpenAI account has sufficient credits

## Next Steps & Testing

The complete system is ready for use! Try these activities:

### Fashion Design Queries
1. **Test course-specific questions**: "How do I measure for a fitted bodice?"
2. **Try technique guidance**: "Show me how to create French seams"
3. **Ask about Illustrator**: "How do I set up artboards for fashion flats?"

### Function Testing
1. **Measurement Calculator**: 
   ```
   "Calculate fabric for a size 14 wrap dress with 3 inches ease"
   ```

2. **Technique Guide**: 
   ```
   "Give me step-by-step instructions for inserting an invisible zipper"
   ```

3. **Illustrator Help**: 
   ```
   "How do I create a seamless textile pattern in Illustrator?"
   ```

### Advanced Features to Explore
- **Source Citations**: Notice how responses include course and module references
- **Course Navigation**: See how the assistant understands course context
- **Educational Support**: Experience student-focused guidance and encouragement

### Development & Extension
- **Code Structure**: Review the modular architecture in `/src/lib/`
- **Knowledge Base**: Examine course content in `/src/data/`
- **Function Implementation**: Study `/src/lib/fashion-functions.ts`
- **Domain Adaptation**: Understand how the system was transformed from technical to fashion domain

## Project Achievement

This project demonstrates a complete RAG system transformation while maintaining technical excellence - a unique achievement in showing domain adaptability of well-architected AI systems!
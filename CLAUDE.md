# Claude Project Memory - RAG Specialist Bot

## Project Context
**Type:** Sprint 2 Capstone - Advanced RAG Chatbot  
**Framework:** Next.js 15 + TypeScript + Tailwind + LangChain  
**Domain:** Technical Documentation Assistant (Next.js/React)  
**Time Allocation:** 20-25 hours  
**Goal:** Specialized chatbot with advanced RAG + function calling  

## Core Requirements Checklist
- [x] Advanced RAG with query translation and structured retrieval
- [ ] Minimum 3 function calls relevant to domain
- [x] Domain-specific knowledge base and prompts
- [x] LangChain integration with proper error handling
- [x] Intuitive Next.js interface with progress indicators
- [x] Security measures (rate limiting, input validation)

## Phase 1 Completion Status ✅
**Completed Components:**
- ✅ `src/app/components/ChatInterface.tsx` - Full chat UI with error handling
- ✅ `src/app/api/chat/route.ts` - OpenAI integration with comprehensive error handling
- ✅ `src/app/page.tsx` - Updated to use ChatInterface
- ✅ `src/app/layout.tsx` - Updated metadata
- ✅ `.env.local` - Environment configuration

**Working Features:**
- Real-time chat with professional UI
- Message state management with timestamps
- Loading indicators and error states
- Input validation (length limits, required fields)
- Comprehensive error handling (API, network, validation)
- Keyboard shortcuts and responsive design
- Specialized Next.js/React system prompt

## Key Commands & Workflows

### Development Commands
```bash
# Start development server
npm run dev

# Build and test
npm run build
npm run start

# Lint and typecheck (run before completion)
npm run lint
npm run typecheck  # Add this script if missing
```

### Project Structure (Current)
```
src/
├── app/
│   ├── api/
│   │   └── chat/route.ts          # ✅ RAG-enabled chat endpoint (COMPLETED)
│   ├── components/
│   │   ├── ChatInterface.tsx      # ✅ Enhanced chat UI (COMPLETED)
│   │   └── SourceCitations.tsx    # ✅ Source display component (COMPLETED)
│   ├── page.tsx                   # ✅ Main page (COMPLETED)
│   ├── layout.tsx                 # ✅ Updated layout (COMPLETED)
│   └── globals.css                # Default styles
├── lib/
│   ├── rag-system.ts              # ✅ RAG implementation (COMPLETED)
│   ├── vector-store.ts            # ✅ Vector database (COMPLETED)
│   └── knowledge-base.ts          # ✅ Documentation loader (COMPLETED)
├── data/
│   ├── nextjs-docs.md             # ✅ Next.js documentation (COMPLETED)
│   ├── react-docs.md              # ✅ React documentation (COMPLETED)
│   └── troubleshooting.md         # ✅ Troubleshooting guide (COMPLETED)
├── .env.local                     # ✅ Environment config (COMPLETED)
└── package.json                   # ✅ Dependencies installed

### Project Structure (Target)
```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # ✅ COMPLETED
│   │   ├── functions/route.ts     # TODO: Function calling endpoint
│   │   └── embeddings/route.ts    # TODO: Vector operations
│   ├── components/
│   │   ├── ChatInterface.tsx      # ✅ COMPLETED
│   │   ├── MessageBubble.tsx      # TODO: Message display component
│   │   ├── FunctionResults.tsx    # TODO: Function call UI
│   │   └── SourceCitations.tsx    # TODO: Source display
│   ├── lib/
│   │   ├── rag-system.ts          # TODO: RAG implementation
│   │   ├── functions.ts           # TODO: Function definitions
│   │   ├── vector-store.ts        # TODO: Vector database
│   │   └── knowledge-base.ts      # TODO: Documentation loader
│   ├── data/                      # TODO: Knowledge base files
│   └── ...existing files
```

## Implementation Strategy

### Phase 1: Foundation (6-8 hours) ✅ COMPLETED
**Prompt:** "Implement basic chat interface with OpenAI integration"
1. ✅ Create ChatInterface component with state management
2. ✅ Set up /api/chat route with OpenAI ChatCompletion
3. ✅ Add basic error handling and loading states
4. ✅ Test with simple queries

**Phase 1 Results:**
- Professional chat interface with Tailwind CSS styling
- Comprehensive error handling for all failure scenarios
- Input validation and security measures
- Responsive design with loading indicators
- Ready for RAG integration

### Phase 2: RAG System (8-10 hours) ✅ COMPLETED
**Prompt:** "Implement advanced RAG with Next.js documentation knowledge base"
1. ✅ Create knowledge base with Next.js/React docs
2. ✅ Implement vector embeddings with OpenAI
3. ✅ Add document chunking and similarity search
4. ✅ Integrate retrieval with chat responses
5. ✅ Add source citations to responses

**Phase 2 Results:**
- Comprehensive knowledge base with 3 documentation sources
- Vector embeddings with OpenAI text-embedding-3-small
- Hybrid search combining vector similarity and text matching
- Source citations displayed in professional UI components
- RAG system with query enhancement and context ranking
- Fallback mechanisms for robust error handling

### Phase 3: Function Calling (6-8 hours)
**Prompt:** "Add 3+ function calls for technical documentation assistance"
1. **Code Validator:** Validate React/Next.js syntax
2. **Component Generator:** Create React components from specs
3. **Docs Searcher:** Search specific documentation sections
4. Set up function routing and result display
5. Add function call UI components

### Phase 4: Polish (4-6 hours)
**Prompt:** "Add production-ready features and optional enhancements"
1. Input validation with Zod schemas
2. Rate limiting and API key management
3. Conversation history and export
4. Advanced error handling
5. Performance optimizations

## Function Call Specifications

### 1. Code Validator
```typescript
{
  name: "validate_code",
  description: "Validate React/Next.js code syntax and patterns",
  parameters: {
    code: string,
    framework: "react" | "nextjs",
    checkPatterns: boolean
  }
}
```

### 2. Component Generator
```typescript
{
  name: "generate_component",
  description: "Generate React component from specifications",
  parameters: {
    componentName: string,
    props: object,
    styling: "tailwind" | "css" | "styled",
    typescript: boolean
  }
}
```

### 3. Documentation Searcher
```typescript
{
  name: "search_docs",
  description: "Search Next.js/React documentation",
  parameters: {
    query: string,
    docType: "api" | "guide" | "reference",
    version: string
  }
}
```

## Knowledge Base Content Strategy

### Primary Sources:
1. **Next.js Documentation:**
   - App Router guide
   - API Routes
   - Server Components
   - Client Components
   - Routing and Navigation

2. **React Documentation:**
   - Component patterns
   - Hooks reference
   - State management
   - Performance optimization

3. **Best Practices:**
   - TypeScript patterns
   - Testing strategies
   - Deployment guides
   - Common troubleshooting

### Document Processing:
- Chunk size: 1000 characters
- Overlap: 200 characters
- Include metadata: source, section, version
- Format: Markdown with proper headings

## Security & Performance

### Rate Limiting:
- 10 requests per minute per user
- Exponential backoff for API calls
- Queue management for concurrent requests

### Input Validation:
```typescript
const MessageSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
  functions: z.array(z.string()).optional()
});
```

### Error Handling Patterns:
- API errors: Show user-friendly messages
- Function errors: Fallback to basic chat
- Network errors: Retry with exponential backoff
- Validation errors: Clear field-specific feedback

## Testing Strategy

### Manual Testing Checklist:
- [ ] Basic chat responds correctly
- [ ] RAG retrieves relevant docs
- [ ] Functions execute without errors
- [ ] Sources are properly displayed
- [ ] Error scenarios handled gracefully
- [ ] Mobile responsive design
- [ ] Performance acceptable (<3s response)

### Test Scenarios:
1. **Simple Questions:** "How do I create a Next.js app?"
2. **Code Validation:** "Check this React component for issues"
3. **Component Generation:** "Create a login form component"
4. **Complex Queries:** "How to optimize Next.js for SEO?"
5. **Error Cases:** Invalid code, API failures, rate limits

## Optional Features (For Maximum Points)

### Medium Tasks (Choose 2):
1. **Multi-model Support:** Add Anthropic Claude integration
2. **Real-time Updates:** Hot reload knowledge base changes
3. **Advanced Caching:** Redis/memory cache for embeddings

### Hard Tasks (Choose 1):
1. **Cloud Deployment:** Vercel deployment with scaling
2. **Advanced Analytics:** Usage tracking dashboard
3. **MCP Integration:** Connect to external tool servers

## Critical Success Factors

### Must-Have Features:
1. **Domain Expertise:** Accurate Next.js/React guidance
2. **Function Reliability:** All 3 functions work consistently
3. **Source Attribution:** Always cite documentation sources
4. **Error Recovery:** Graceful handling of all failure modes
5. **Performance:** Responsive UI, <3s query response time

### Quality Indicators:
- Code generates working examples
- Retrieval finds relevant documentation
- Functions provide useful results
- UI is intuitive and responsive
- Errors don't crash the application

## Deployment & Submission

### Pre-submission Checklist:
- [ ] All core requirements implemented
- [ ] 2+ optional medium tasks completed
- [ ] 1+ optional hard task completed
- [ ] Code is well-documented
- [ ] No console errors or warnings
- [ ] Environment variables documented
- [ ] README.md updated with setup instructions

### Deployment Steps:
1. Test locally: `npm run build && npm run start`
2. Deploy to Vercel: Connect GitHub repo
3. Set environment variables in Vercel dashboard
4. Test production deployment
5. Document any deployment-specific configurations

## Common Pitfalls to Avoid

1. **Over-engineering:** Start simple, add complexity gradually
2. **Poor error handling:** Test all failure scenarios
3. **Inefficient retrieval:** Optimize chunking and search
4. **UI complexity:** Focus on functionality first
5. **API rate limits:** Implement proper throttling
6. **Security gaps:** Validate all inputs, secure API keys

## Success Metrics

### Technical Metrics:
- Response time < 3 seconds
- Function success rate > 95%
- Error recovery rate > 90%
- Knowledge base coverage > 80% of common queries

### User Experience:
- Intuitive interface requiring no instructions
- Accurate answers for domain-specific questions
- Helpful error messages and guidance
- Smooth conversation flow

Remember: Focus on core functionality first, then enhance with optional features. Quality over quantity!
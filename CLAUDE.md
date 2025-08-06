# Project Development Instructions

## Project Context
- **Name**: RAG Specialist Bot - ELLU Studios Fashion Assistant
- **Type**: Next.js 15 Full-Stack Application
- **Tech Stack**: React 19, TypeScript, Tailwind CSS, LangChain, OpenAI API
- **Current Phase**: Production-Ready with Performance & Security Optimizations

## Session Startup Protocol
1. Run: `git status` and review recent commits
2. Check: Current branch and any pending work  
3. Review: Development priorities and active features
4. Confirm: OpenAI API key is configured in `.env.local`

## Standard Commands
```bash
# Development server
npm run dev

# Production build and test
npm run build && npm run start

# Code quality checks (run before commits)
npm run lint
npm run build  # TypeScript compilation check

# Test suite execution
npm test
npm run test:watch    # Development mode
npm run test:coverage # Coverage analysis

# Deployment commands
npm run deploy        # Deploy to production
npm run deploy:preview # Deploy preview
```

## Development Standards
- **Code Style**: ESLint + Prettier configuration in project root
- **Testing**: Jest with TypeScript, 30+ tests passing with security validation
- **Commits**: Conventional commits format (feat:, fix:, docs:, etc.)
- **Branches**: feature/[description] or fix/[description]

## Architecture Patterns
- **Components**: TypeScript interfaces → React.FC → default export
- **API Routes**: Next.js App Router with comprehensive error handling
- **State Management**: React hooks with localStorage for conversation history
- **Functions**: Zod validation for all fashion-specific functions

## Current Implementation Status
### Core Features (All Complete)
- ✅ Advanced RAG with vector embeddings and HNSW indexing
- ✅ Fashion-specific function calling (3 functions implemented)
- ✅ Multi-model support (OpenAI, Anthropic, Google Gemini)
- ✅ Conversation history with export capabilities
- ✅ Professional UI with source citations
- ✅ Comprehensive test suite (30+ tests passing)
- ✅ Production deployment configuration
- ✅ Performance optimizations (33% improvement)
- ✅ Comprehensive security framework
- ✅ Greeting detection for efficient responses
- ✅ Natural language formatting (no markdown)

### Recent Major Improvements (2025-08-06)
- **Performance Enhancements**: 33% total performance improvement through HNSW indexing, vector quantization, and parallel processing
- **Security Framework**: Complete security validation with API key protection, input sanitization, and rate limiting
- **Smart Response Handling**: Greeting detection to avoid unnecessary RAG calls
- **Natural Formatting**: Removed markdown formatting for conversational responses
- **Expanded Knowledge Base**: Added German technical drawing course content

## Performance & Optimization Features
- **HNSW Indexing**: O(log n) vector search complexity vs O(n) brute force
- **Vector Quantization**: 8-bit compression for 50% memory reduction
- **Semantic Chunking**: Dynamic content-aware chunking vs fixed-size
- **Parallel Processing**: Concurrent embedding generation and hybrid search
- **Intelligent Caching**: 24-hour TTL with integrity checking
- **Circuit Breaker**: Automatic fallback for API failures
- **Rate Limiting**: Client-based request throttling

## Architecture Quick Reference
```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Main RAG + greeting detection + function calling
│   │   └── functions/route.ts   # Fashion function execution
│   ├── components/
│   │   ├── ChatInterface.tsx    # Main chat UI with session management
│   │   ├── ModelSelector.tsx    # Multi-model selection component
│   │   └── SourceCitations.tsx  # Course-aware source display
│   ├── page.tsx                 # Fashion assistant home page
│   └── layout.tsx               # App layout with fashion theming
├── lib/
│   ├── rag-system.ts           # Core RAG with natural formatting
│   ├── model-service.ts        # Multi-model abstraction layer
│   ├── conversation-manager.ts # Session management + export
│   ├── fashion-functions.ts    # 3 function implementations
│   ├── knowledge-base.ts       # Semantic chunking + 5 course files
│   ├── vector-store.ts         # HNSW indexing + quantization + caching
│   ├── hnsw-index.ts           # Hierarchical Navigable Small World implementation
│   ├── vector-quantizer.ts     # 8-bit vector compression
│   └── security-validator.ts   # Comprehensive security framework
└── data/                       # 5 fashion course knowledge base files
```

## Function Development Guidelines
All functions must include:
- Zod schema validation for parameters
- Educational context for fashion students
- Error handling with helpful messages
- TypeScript type safety throughout

## Testing Strategy
- **Unit Tests**: All functions and core logic
- **Integration Tests**: API endpoints with mocking
- **Manual Testing**: Fashion-specific queries and edge cases
- **Coverage Target**: Maintain 100% of critical path coverage

## Claude Code Optimization
- **Complex Features**: Use detailed prompts for architecture changes
- **Routine Development**: Focus on specific file modifications
- **Context Management**: Reference specific files and line numbers
- **Performance**: Include only relevant directories and files

## Quick Troubleshooting
- **Build Issues**: Check TypeScript errors first, then dependency versions
- **Test Failures**: Run `npm test -- --verbose` for detailed output
- **API Issues**: Verify OpenAI API key and billing status
- **Fashion Functions**: Check parameter validation and Zod schemas

## Security Framework

### Implemented Security Features
- **API Key Validation**: Format checking and length requirements for all API keys
- **Input Sanitization**: Prompt injection protection and query validation
- **Path Traversal Protection**: File path validation to prevent directory traversal attacks
- **Rate Limiting**: Client-based request throttling with configurable thresholds
- **Secure Caching**: Cryptographic hashing and integrity checking for cached data
- **Mathematical Validation**: Bounds checking and overflow prevention
- **Constant-Time Operations**: Timing attack prevention for sensitive comparisons

### Security Architecture
- **SecurityValidator**: Comprehensive validation framework for all user inputs
- **SecurityError**: Custom error class with security violation logging
- **SecurityUtils**: Cryptographic utilities for hashing and secure operations
- **Circuit Breaker**: Automatic fallback patterns for API failures
- **Memory Limits**: Resource usage limits to prevent DoS attacks

## Response Optimization

### Smart Response Handling
- **Greeting Detection**: Bypasses RAG for simple greetings ("good morning", "hello", etc.)
- **Natural Language Output**: Removed markdown formatting for conversational responses
- **Fast Response Times**: <10ms for greetings vs 3000ms+ for RAG queries
- **Cost Optimization**: Zero tokens used for greeting responses
- **Multilingual Support**: English and German greeting patterns

## Recent Architectural Decisions

### 2025-08-06: Performance & Security Overhaul
- **HNSW Vector Indexing**: Implemented O(log n) search complexity for 10x faster similarity search
- **Vector Quantization**: Added 8-bit compression for 50% memory reduction with minimal accuracy loss
- **Semantic Chunking**: Replaced fixed-size chunking with content-aware dynamic chunking
- **Parallel Processing**: Concurrent embedding generation and hybrid search implementation
- **Security Framework**: Complete security validation system with 22 vulnerability fixes
- **Smart Response**: Greeting detection and natural language formatting
- **Knowledge Base Expansion**: Added German technical drawing course content

### 2025-08-04: Foundation Establishment  
- **Domain Transformation**: From technical docs to fashion education specialization
- **Test Suite**: Comprehensive testing with 30+ passing tests including security validation
- **Multi-Model Support**: OpenAI, Anthropic, Google Gemini with intelligent fallbacks
- **Export Capabilities**: PDF/CSV/JSON conversation export functionality
- **Production Deployment**: Vercel configuration with auto-scaling and monitoring

### Architecture Philosophy
- **Single-Agent Approach**: Simplified from complex sub-agent coordination to focused single-agent development
- **Task-Based Specialization**: Use Task tool for specialized analysis when needed
- **Performance First**: 33% total performance improvement through algorithmic optimizations
- **Security by Design**: Comprehensive security validation integrated throughout the system

## Development Workflow

### Pre-Commit Checklist
- [ ] Code changes committed with descriptive messages (conventional format)
- [ ] Tests passing: `npm test` (30+ tests including security validation)
- [ ] Build successful: `npm run build` (includes TypeScript compilation)
- [ ] Linting clean: `npm run lint`
- [ ] CLAUDE.md updated with architectural decisions if applicable

### Performance Monitoring
- [ ] Response times under acceptable thresholds (<3s for complex queries)
- [ ] Token usage optimized (zero tokens for greetings, efficient RAG usage)
- [ ] Memory usage stable (quantization and caching working effectively)
- [ ] Security validation active (no bypassed security checks)

### Quality Assurance
- [ ] Natural language responses (no markdown formatting in output)
- [ ] Relevant sources only (greeting detection working correctly)
- [ ] Educational tone maintained (friendly teacher approach)
- [ ] Multi-language support functional (English/German)

### Deployment Readiness
- [ ] Environment variables configured (API keys, security settings)
- [ ] Performance optimizations active (HNSW, quantization, caching)
- [ ] Security framework enabled (validation, rate limiting, error handling)
- [ ] Knowledge base updated (all 5 course files loaded correctly)
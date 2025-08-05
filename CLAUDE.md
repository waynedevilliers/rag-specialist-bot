# Project Development Instructions

## Project Context
- **Name**: RAG Specialist Bot - ELLU Studios Fashion Assistant
- **Type**: Next.js 15 Full-Stack Application
- **Tech Stack**: React 19, TypeScript, Tailwind CSS, LangChain, OpenAI API
- **Current Phase**: Production-Ready Deployment

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
npm run typecheck

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
- **Testing**: Jest with TypeScript, 27/27 tests passing
- **Commits**: Conventional commits format (feat:, fix:, docs:, etc.)
- **Branches**: feature/[description] or fix/[description]

## Architecture Patterns
- **Components**: TypeScript interfaces → React.FC → default export
- **API Routes**: Next.js App Router with comprehensive error handling
- **State Management**: React hooks with localStorage for conversation history
- **Functions**: Zod validation for all fashion-specific functions

## Current Implementation Status
### Core Features (All Complete)
- ✅ Advanced RAG with vector embeddings and hybrid search
- ✅ Fashion-specific function calling (3 functions implemented)
- ✅ Multi-model support (OpenAI, Anthropic, Google Gemini)
- ✅ Conversation history with export capabilities
- ✅ Professional UI with source citations
- ✅ Comprehensive test suite (27/27 passing)
- ✅ Production deployment configuration

### Active Development Areas
- Performance optimization and caching improvements
- Enhanced conversation export formats
- Error handling refinements
- User experience enhancements

## Known Issues & Workarounds
- **OpenAI Rate Limits**: Implemented exponential backoff retry logic
- **Large Knowledge Base**: Using efficient chunking (1000 chars, 200 overlap)
- **Memory Management**: Vector embeddings cached in-memory with cleanup

## Architecture Quick Reference
```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Main RAG + function calling endpoint
│   │   └── functions/route.ts   # Fashion function execution
│   ├── components/
│   │   ├── ChatInterface.tsx    # Main chat UI with session management
│   │   ├── ModelSelector.tsx    # Multi-model selection component
│   │   └── SourceCitations.tsx  # Course-aware source display
│   ├── page.tsx                 # Fashion assistant home page
│   └── layout.tsx               # App layout with fashion theming
├── lib/
│   ├── rag-system.ts           # Core RAG implementation
│   ├── model-service.ts        # Multi-model abstraction layer
│   ├── conversation-manager.ts # Session management + export
│   ├── fashion-functions.ts    # 3 function implementations
│   └── knowledge-base.ts       # Fashion course content management
└── data/                       # 4 fashion course knowledge base files
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

## Sub-Agent Architecture

### Active Coordination Structure
- **Status Tracking**: `.claude/status.md` - Daily progress updates from all agents
- **Agent State**: `.claude/agent-state.json` - Current sprint priorities and coordination
- **Handoff Requests**: `.claude/handoffs/` - Cross-agent communication and requests
- **Session Management**: `.claude/sessions/` - Agent-specific session configurations

### Agent Specializations
- **Lead Agent** (Current): Coordination, architecture decisions, git management, integration
- **RAG/AI Specialist**: Vector embeddings, model optimization, RAG pipeline performance  
- **Frontend Specialist**: React components, UI/UX, conversation management (planned)
- **API Specialist**: Route optimization, fashion functions, error handling (planned)
- **Testing Specialist**: Coverage expansion, performance testing, validation (planned)

### Coordination Protocols
1. **Daily Sync**: Lead agent reviews `.claude/status.md` and coordinates priorities
2. **Handoff Communication**: Agents create requests in `.claude/handoffs/` for cross-agent needs
3. **Git Strategy**: Lead agent handles all commits and merges; specialists work in focused branches
4. **Session Management**: Each agent maintains focused context without interference

### Current Sprint: AI Performance Optimization
- **Priority 1**: RAG system optimization and vector embedding efficiency
- **Priority 2**: Multi-model response quality improvement  
- **Priority 3**: Performance monitoring and caching implementation
- **Target**: 30% performance improvement by 2025-08-06

## Recent Architectural Decisions
- **2024-08-04**: Completed domain transformation from technical docs to fashion education
- **2024-08-04**: Implemented comprehensive test suite with 27 passing tests
- **2024-08-04**: Added multi-model support with fallback mechanisms
- **2024-08-04**: Enhanced export capabilities with PDF/CSV/JSON formats
- **2024-08-04**: Configured Vercel deployment with production scaling
- **2024-08-04**: Established sub-agent coordination architecture for specialized development

## Session End Checklist
- [ ] Code changes committed with descriptive messages
- [ ] Tests passing: `npm test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No linting issues: `npm run lint`
- [ ] CLAUDE.md updated with new decisions if applicable
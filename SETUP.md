# RAG Specialist Bot - Setup Guide

## Prerequisites
- Node.js 18+ and npm
- OpenAI API key
- VS Code (recommended)

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
NEXT_PUBLIC_APP_NAME=RAG Specialist Bot
NEXT_PUBLIC_APP_DESCRIPTION=A specialized chatbot for technical documentation
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

### 4. Test the Chat
Try these example queries:
- "How do I create a Next.js app?"
- "What's the difference between server and client components?"
- "Help me optimize this React component for performance"

## Current Features (Phase 1)

### ✅ Working Features
- **Real-time Chat**: Professional chat interface with message history
- **Error Handling**: Comprehensive error handling for API failures, network issues, rate limits
- **Input Validation**: Message length limits, required field validation
- **Loading States**: Animated loading indicators during API calls
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Specialized Assistant**: Focused on Next.js/React development help

### 🔄 In Development (Phase 2)
- **RAG System**: Knowledge base with Next.js/React documentation
- **Vector Search**: Semantic search through documentation
- **Source Citations**: References to original documentation
- **Function Calling**: Code validation, component generation, docs search

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
```

## Project Structure
```
rag-specialist-bot/
├── src/app/
│   ├── api/chat/route.ts          # OpenAI chat endpoint
│   ├── components/
│   │   └── ChatInterface.tsx      # Main chat UI
│   ├── page.tsx                   # Home page
│   ├── layout.tsx                 # App layout
│   └── globals.css                # Global styles
├── .env.local                     # Environment variables
├── package.json                   # Dependencies
├── PROJECT_ANALYSIS.md            # Project planning
├── CLAUDE.md                      # Development memory
└── SETUP.md                       # This file
```

## API Endpoints

### POST /api/chat
**Purpose:** Main chat endpoint for user queries

**Request:**
```json
{
  "message": "How do I create a Next.js component?"
}
```

**Response:**
```json
{
  "content": "To create a Next.js component...",
  "sources": [],
  "timestamp": "2025-01-28T10:00:00Z"
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
| `NEXT_PUBLIC_APP_NAME` | No | App display name | `RAG Specialist Bot` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | No | App description | `AI chatbot for developers` |
| `NODE_ENV` | No | Environment mode | `development` |

## Security Considerations

### Current Security Measures
- ✅ **Input Validation**: Message length limits (2000 chars)
- ✅ **Error Handling**: No sensitive information in error messages
- ✅ **API Key Protection**: Server-side only, not exposed to client
- ✅ **Request Validation**: Type checking with proper error responses

### Future Security Enhancements (Phase 3)
- Rate limiting per user/IP
- Request logging and monitoring
- Input sanitization for code examples
- CORS configuration for production

## Performance Considerations

### Current Optimizations
- Efficient React state management
- Tailwind CSS for minimal bundle size
- TypeScript for better development experience
- Error boundaries to prevent crashes

### Future Optimizations (Phase 2+)
- Vector database caching
- Response streaming for long responses
- Conversation history persistence
- Bundle optimization and code splitting

## Getting Help

### Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [LangChain.js Documentation](https://js.langchain.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Support
- Check the browser console for errors
- Review the API response in Network tab
- Ensure environment variables are correctly set
- Verify OpenAI account has sufficient credits

## Next Steps

Once you have the basic chat working:

1. **Add your specific queries** to test the Next.js/React assistance
2. **Review the code structure** in `src/app/components/ChatInterface.tsx`
3. **Prepare for Phase 2** by reviewing the knowledge base requirements
4. **Test error scenarios** by temporarily removing the API key

The foundation is solid and ready for RAG implementation!
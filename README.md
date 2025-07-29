# RAG Specialist Bot

A sophisticated Next.js chatbot specialized in providing technical documentation assistance for React and Next.js development. Built with advanced RAG (Retrieval-Augmented Generation) capabilities and powered by OpenAI's GPT models.

![Next.js](https://img.shields.io/badge/Next.js-15.4.4-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![LangChain](https://img.shields.io/badge/LangChain-0.3.30-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwind-css)

## 🚀 Features

### ✅ Phase 1: Foundation (Completed)
- **Professional Chat Interface**: Real-time messaging with TypeScript and Tailwind CSS
- **OpenAI Integration**: GPT-4 powered responses via LangChain
- **Comprehensive Error Handling**: Graceful handling of API failures, network issues, and rate limits
- **Input Validation**: Message length limits and security measures
- **Responsive Design**: Mobile-friendly interface with loading indicators

### ✅ Phase 2: Advanced RAG (Completed)
- **Knowledge Base**: Comprehensive Next.js, React, and troubleshooting documentation
- **Vector Embeddings**: OpenAI text-embedding-3-small with semantic search
- **Smart Document Chunking**: 1000-character chunks with 200-character overlap
- **Hybrid Search**: Combines vector similarity and text-based matching
- **Source Citations**: Professional UI displaying document sources with relevance scores
- **Query Enhancement**: Automatic abbreviation expansion and context improvement

### 🛠️ Phase 3: Function Calling (Planned)
- **Code Validator**: Validate React/Next.js syntax and patterns
- **Component Generator**: Generate React components from specifications
- **Documentation Searcher**: Advanced search through specific documentation sections

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   └── chat/route.ts          # RAG-enabled chat endpoint
│   ├── components/
│   │   ├── ChatInterface.tsx      # Main chat UI with enhanced features
│   │   └── SourceCitations.tsx    # Source display component
│   ├── page.tsx                   # Home page
│   ├── layout.tsx                 # App layout
│   └── globals.css                # Global styles
├── lib/
│   ├── rag-system.ts              # Core RAG implementation
│   ├── vector-store.ts            # Vector embeddings and similarity search
│   └── knowledge-base.ts          # Document loading and chunking
├── data/
│   ├── nextjs-docs.md             # Next.js documentation
│   ├── react-docs.md              # React documentation
│   └── troubleshooting.md         # Troubleshooting guide
└── package.json                   # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key with billing configured
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rag-specialist-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env.local` in the project root:
   ```env
   # Required: OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional: App Configuration
   NEXT_PUBLIC_APP_NAME=RAG Specialist Bot
   NEXT_PUBLIC_APP_DESCRIPTION=A specialized chatbot for technical documentation
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` (or the port shown in terminal)

## 💡 Usage Examples

### Basic Queries
- "How do I create a Next.js app?"
- "What's the difference between server and client components?"
- "How do I use React hooks?"

### Advanced Queries
- "Help me optimize this React component for performance"
- "What are the best practices for Next.js API routes?"
- "How do I handle errors in server components?"

### Code Analysis
- Paste code snippets for validation and improvement suggestions
- Get explanations of React patterns and Next.js features
- Receive troubleshooting guidance for common issues

## 🧠 RAG System Details

### Knowledge Base
- **Next.js Documentation**: App Router, API routes, server/client components, routing
- **React Documentation**: Components, hooks, state management, performance optimization
- **Troubleshooting Guide**: Common issues, debugging tips, best practices

### Vector Search Process
1. **Document Chunking**: Text split into overlapping 1000-character chunks
2. **Embedding Generation**: OpenAI text-embedding-3-small creates 1536-dimension vectors
3. **Query Processing**: User queries enhanced with abbreviation expansion
4. **Hybrid Search**: Combines semantic similarity (70%) and text matching (30%)
5. **Context Ranking**: Sources ranked by relevance and provided as context

### Response Generation
- **Context-Aware**: Uses retrieved documentation for accurate responses
- **Source Attribution**: All responses include citations to original sources
- **Fallback Handling**: Graceful degradation when vector search unavailable
- **Performance Tracking**: Response times and processing metrics displayed

## 🔧 Development

### Available Scripts
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Type checking (if configured)
npm run typecheck
```

### Project Structure
- **`/src/app`**: Next.js App Router pages and API routes
- **`/src/components`**: Reusable React components
- **`/src/lib`**: Core business logic and utilities
- **`/src/data`**: Static knowledge base files

### Key Technologies
- **Next.js 15**: App Router, API routes, server components
- **React 19**: Latest features and patterns
- **TypeScript**: Full type safety throughout
- **LangChain**: AI/ML integration framework
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Modern icon library

## 🔒 Security & Performance

### Security Measures
- **Input Validation**: Message length limits and content sanitization
- **API Key Protection**: Server-side only, never exposed to client
- **Error Handling**: No sensitive information in error responses
- **Request Validation**: Type checking with proper error responses

### Performance Optimizations
- **Efficient Embeddings**: Cost-effective text-embedding-3-small model
- **Smart Caching**: Vector embeddings cached in memory
- **Hybrid Search**: Optimized balance of semantic and text search
- **Response Streaming**: Future enhancement for long responses

## 🧪 Testing

### Manual Testing Scenarios
1. **Basic Chat**: Simple Next.js/React questions
2. **RAG Retrieval**: Complex queries requiring documentation lookup
3. **Error Handling**: API failures, invalid inputs, network issues
4. **UI Responsiveness**: Mobile/desktop compatibility
5. **Source Citations**: Verify accurate source attribution

### Test Queries
```
"How do I create a new Next.js app?"
"What are React Server Components?"
"Help me debug this hydration error"
"Show me how to optimize images in Next.js"
"What's the difference between getServerSideProps and getStaticProps?"
```

## 📊 System Status

The application provides real-time system status including:
- RAG system initialization status
- Vector store readiness
- Knowledge base loading status
- Total chunks and vectors processed
- Response processing times

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Environment Variables for Production
```env
OPENAI_API_KEY=your_production_api_key
NODE_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork and create a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain comprehensive error handling
- Test all changes with various query types
- Update documentation for new features
- Ensure mobile responsiveness

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI**: GPT models and embeddings API
- **Vercel**: Next.js framework and deployment platform
- **LangChain**: AI application development framework
- **Tailwind CSS**: Utility-first CSS framework

## 📞 Support

For issues, questions, or contributions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include error messages and steps to reproduce
4. Specify your environment (Node.js version, browser, etc.)

---

**Built with ❤️ for the Next.js and React development community**
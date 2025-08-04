# ELLU Studios Fashion Design Assistant

A sophisticated AI-powered chatbot specialized in providing fashion design education support for students. Features advanced RAG (Retrieval-Augmented Generation) capabilities, function calling, and multi-model support powered by OpenAI, Anthropic, and Google Gemini.

![Next.js](https://img.shields.io/badge/Next.js-15.4.4-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![LangChain](https://img.shields.io/badge/LangChain-0.3.30-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwind-css)

## What This App Does

This fashion design assistant helps students with:

- **Course Content Support**: Get help with 4 ELLU Studios fashion design courses
- **Practical Calculations**: Calculate fabric requirements and pattern measurements
- **Step-by-Step Guidance**: Detailed instructions for fashion construction techniques  
- **Adobe Illustrator Help**: Professional workflows for fashion design software
- **24/7 Student Support**: Instant answers to fashion design questions

## Key Features

### 🎨 Fashion Education Support
- **Pattern Making Fundamentals** (Course 101): Measurements, ease, seam allowances
- **Adobe Illustrator for Fashion** (Course 201): Technical flats, color palettes, patterns
- **Draping Techniques** (Course 301): Muslin preparation, bodice draping, bias work
- **Fashion Construction Methods** (Course 401): Professional sewing, fitting, finishing

### 🔧 Smart Functions
1. **Measurement Calculator**: Calculate fabric yardage and pattern dimensions
2. **Technique Guide Generator**: Step-by-step fashion construction guidance
3. **Illustrator Help Assistant**: Adobe Illustrator tutorials for fashion design

### 🤖 AI Capabilities
- **Multi-Model Support**: Choose between OpenAI GPT, Anthropic Claude, or Google Gemini
- **Advanced RAG**: Semantic search through fashion course documentation
- **Source Citations**: Always shows which course and module information comes from
- **Conversation History**: Save and manage multiple chat sessions

### 📱 User Experience
- **Professional Interface**: Clean, modern design optimized for students
- **Export Conversations**: Save chats as PDF, CSV, or JSON
- **Responsive Design**: Works perfectly on desktop and mobile
- **Real-time Processing**: See response times and model usage

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key (required)

### Installation
1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd rag-specialist-bot
   npm install
   ```

2. **Set up your API key**:
   Create `.env.local` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the app**:
   ```bash
   npm run dev
   ```

4. **Open your browser**: Go to `http://localhost:3000`

## Usage Examples

### Fashion Student Questions
- "How do I calculate fabric for a wrap dress?"
- "What's the difference between draping and pattern making?"
- "Help me understand bias grain in draping"
- "How do I create technical flats in Illustrator?"

### Function Calling
- **Measurements**: "Calculate fabric needed for a size 12 blouse with 3 inches ease"
- **Technique Help**: "Show me how to set sleeves properly step by step"
- **Illustrator**: "How do I create a seamless textile pattern repeat?"

### Course-Specific Support
- Get clarification on video lesson content
- Troubleshoot construction problems
- Learn professional techniques and avoid common mistakes

## Educational Value

This assistant is designed specifically for fashion design students to:

✅ **Clarify Course Content**: Get help understanding video lessons and course materials  
✅ **Practice Calculations**: Learn to calculate measurements and fabric requirements  
✅ **Master Techniques**: Step-by-step guidance for complex construction methods  
✅ **Use Professional Tools**: Learn Adobe Illustrator workflows for fashion design  
✅ **Build Confidence**: Get encouragement and support throughout your learning journey  

## Architecture

Built with modern web technologies:
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes with comprehensive error handling
- **AI Integration**: LangChain + OpenAI/Anthropic/Google APIs
- **Search**: Vector embeddings with hybrid semantic + text search
- **Storage**: Browser localStorage for conversation history

## Deployment

Ready for production deployment on Vercel with optimized scaling configuration.

## Contributing

This project demonstrates advanced RAG system implementation and domain transformation capabilities. Contributions welcome for:

- Additional fashion course content
- New function implementations
- UI/UX improvements
- Performance optimizations

## License

MIT License - See LICENSE file for details.

## Support

For questions about fashion design techniques, just ask the assistant! For technical issues:

1. Check that your OpenAI API key is configured correctly
2. Ensure you have billing set up on your OpenAI account
3. Verify Node.js version compatibility (18+)

---

**Built for fashion design students by demonstrating the power of specialized AI assistants**
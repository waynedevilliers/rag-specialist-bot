# Setup Guide

Quick installation and configuration guide for the ELLU Studios Fashion Design Assistant.

## Prerequisites

- **Node.js 18+** and npm
- **OpenAI API key** with billing configured
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd rag-specialist-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create `.env.local` in project root:
```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
NEXT_PUBLIC_APP_NAME=ELLU Studios Fashion Assistant
NODE_ENV=development
```

**Getting OpenAI API Key:**
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy key to `.env.local`
5. **Important**: Add billing to your OpenAI account

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Application
Navigate to `http://localhost:3000`

## Verification

Test these queries to verify setup:
- "How do I calculate fabric for a wrap dress?"
- "Show me how to create darts properly"
- "Calculate fabric needed for a size 12 blouse"

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Quality Checks
npm run lint            # Run ESLint
npm run typecheck       # Check TypeScript

# Testing
npm test                # Run test suite
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Troubleshooting

**"Invalid API key" Error:**
- Verify OpenAI API key in `.env.local`
- Restart dev server after adding key
- Check OpenAI account has billing enabled

**Port 3000 Already in Use:**
```bash
# Kill existing process
pkill -f "next dev"

# Or use different port
npm run dev -- -p 3001
```

**Dependencies Issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Chat Not Responding:**
- Check browser console for errors
- Verify OpenAI API status at [status.openai.com](https://status.openai.com)
- Confirm API key has sufficient credits

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT models |
| `NEXT_PUBLIC_APP_NAME` | No | Display name for app |
| `NODE_ENV` | No | Environment (development/production) |

## Production Setup

For production deployment:

1. **Build application:**
   ```bash
   npm run build
   ```

2. **Test production build:**
   ```bash
   npm run start
   ```

3. **Deploy to Vercel:**
   ```bash
   npm run deploy
   ```

## System Requirements

- **Node.js**: 18.0.0 or higher
- **RAM**: 512MB minimum for development
- **Storage**: 200MB for dependencies
- **Network**: Internet connection for OpenAI API calls

Setup complete! The fashion design assistant is ready to help students with course content, calculations, and technical guidance.
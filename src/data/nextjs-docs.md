# Next.js Documentation - Core Concepts

## App Router

### Creating a New Next.js App

To create a new Next.js application, use the `create-next-app` command:

```bash
npx create-next-app@latest my-app
cd my-app
npm run dev
```

This creates a new Next.js application with the App Router (default in Next.js 13+).

### File-based Routing

Next.js uses file-based routing where:
- `app/page.tsx` - Root page (/)
- `app/about/page.tsx` - About page (/about)
- `app/blog/[slug]/page.tsx` - Dynamic route (/blog/hello-world)

### Layouts

Layouts are shared UI that wrap multiple pages. Create a `layout.tsx` file:

```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Server vs Client Components

**Server Components (default):**
- Rendered on the server
- Cannot use browser APIs or event handlers
- Can directly access databases and APIs
- Better for SEO and initial page load

**Client Components:**
- Rendered in the browser
- Use the `"use client"` directive at the top
- Can use React hooks and browser APIs
- Interactive components with event handlers

```typescript
// Server Component (default)
export default function ServerComponent() {
  return <div>Rendered on server</div>
}

// Client Component
"use client"
import { useState } from 'react'

export default function ClientComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## API Routes

### Creating API Routes

Create API endpoints in the `app/api` directory:

```typescript
// app/api/hello/route.ts
export async function GET() {
  return Response.json({ message: 'Hello World' })
}

export async function POST(request: Request) {
  const data = await request.json()
  return Response.json({ received: data })
}
```

### Route Handlers

Supported HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

```typescript
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  
  return Response.json({ query })
}
```

## Data Fetching

### Server-side Data Fetching

```typescript
// Server Component - fetch data directly
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  const posts = await data.json()
  
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  )
}
```

### Client-side Data Fetching

```typescript
"use client"
import { useEffect, useState } from 'react'

export default function ClientDataComponent() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
  }, [])
  
  if (!data) return <div>Loading...</div>
  
  return <div>{JSON.stringify(data)}</div>
}
```

## Styling

### CSS Modules

```css
/* styles/Home.module.css */
.container {
  padding: 0 2rem;
}

.main {
  min-height: 100vh;
  padding: 4rem 0;
}
```

```typescript
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1>Hello World</h1>
      </main>
    </div>
  )
}
```

### Tailwind CSS

Install and configure Tailwind CSS:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## Performance Optimization

### Image Optimization

Use the Next.js Image component for automatic optimization:

```typescript
import Image from 'next/image'

export default function Profile() {
  return (
    <Image
      src="/profile.jpg"
      alt="Profile picture"
      width={500}
      height={500}
      priority
    />
  )
}
```

### Font Optimization

Use `next/font` for optimized web fonts:

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

## Environment Variables

Create `.env.local` for environment variables:

```env
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-secret-api-key
NEXT_PUBLIC_ANALYTICS_ID=your-public-id
```

Access in your code:

```typescript
// Server-side only
const dbUrl = process.env.DATABASE_URL

// Available on client-side (prefixed with NEXT_PUBLIC_)
const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID
```

## Deployment

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts to deploy

### Build for Production

```bash
npm run build
npm run start
```

The `build` command creates an optimized production build, and `start` serves the production build.

## Common Patterns

### Error Boundaries

```typescript
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>
    }

    return this.props.children
  }
}
```

### Loading States

```typescript
import { Suspense } from 'react'

function Loading() {
  return <div>Loading...</div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <DataComponent />
    </Suspense>
  )
}
```
# Next.js and React Troubleshooting Guide ## Common Next.js Issues ### 1. Hydration Errors **Problem:** Content mismatch between server and client
```
Error: Text content does not match server-rendered HTML
``` **Solutions:**
```typescript
// Bad: Using browser-only APIs during SSR
function BadComponent() { return <div>{localStorage.getItem('theme')}</div>
} // Good: Check if running on client
function GoodComponent() { const [theme, setTheme] = useState<string | null>(null) useEffect(() => { setTheme(localStorage.getItem('theme')) }, []) return <div>{theme || 'default'}</div>
} // Alternative: Use dynamic imports with ssr: false
import dynamic from 'next/dynamic' const ClientOnlyComponent = dynamic( () => import('./ClientOnlyComponent'), { ssr: false }
)
``` ### 2. "use client" Directive Issues **Problem:** Server components trying to use client-side features ```typescript
// Error: Cannot use useState in server component
export default function ServerComponent() { const [count, setCount] = useState(0) // Error return <div>{count}</div>
} // Solution: Add "use client" directive
"use client"
export default function ClientComponent() { const [count, setCount] = useState(0) // Works return <div>{count}</div>
}
``` ### 3. API Route Issues **Problem:** API routes not found or returning errors ```typescript
// Common mistakes in app/api/hello/route.ts // Bad: Wrong export names
export function get() { // Should be GET return Response.json({ message: 'hello' })
} // Good: Correct export names
export async function GET() { // Correct return Response.json({ message: 'hello' })
} // Bad: Not handling errors
export async function POST(request: Request) { const data = await request.json() // Could throw return Response.json({ data })
} // Good: Error handling
export async function POST(request: Request) { try { const data = await request.json() return Response.json({ data }) } catch (error) { return Response.json( { error: 'Invalid JSON' }, { status: 400 } ) }
}
``` ### 4. Image Optimization Issues **Problem:** Images not loading or optimizing ```typescript
// Bad: Using regular img tag
function BadImage() { return <img src="/large-image.jpg" alt="Large image" /> // No optimization
} // Good: Using Next.js Image component
import Image from 'next/image' function GoodImage() { return ( <Image src="/large-image.jpg" alt="Large image" width={800} height={600} placeholder="blur" blurDataURL="data:image/jpeg;base64,..." /> )
}
``` ### 5. Environment Variables Not Working **Problem:** Environment variables undefined ```typescript
// Check if variables are properly prefixed
// For client-side access, use NEXT_PUBLIC_ prefix // .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://localhost:5432/db // In component
function Component() { // Available on client const apiUrl = process.env.NEXT_PUBLIC_API_URL // Only available on server const dbUrl = process.env.DATABASE_URL
} // In API route (server-side)
export async function GET() { // Both available on server const apiUrl = process.env.NEXT_PUBLIC_API_URL const dbUrl = process.env.DATABASE_URL
}
``` ## Common React Issues ### 1. State Update Batching **Problem:** Multiple state updates not batching properly ```typescript
// React 17 and below - not batched in async functions
function BadExample() { const [count, setCount] = useState(0) const [name, setName] = useState('') const handleClick = async () => { // These cause separate re-renders in React 17 setCount(1) setName('John') }
} // Solution: Use React 18's automatic batching or flushSync
import { flushSync } from 'react-dom' function GoodExample() { const [count, setCount] = useState(0) const [name, setName] = useState('') const handleClick = async () => { // React 18: Automatically batched setCount(1) setName('John') // Force synchronous update if needed flushSync(() => { setCount(2) }) }
}
``` ### 2. useEffect Dependency Issues **Problem:** Missing dependencies or infinite re-renders ```typescript
// Bad: Missing dependencies
function BadEffect({ userId }) { const [user, setUser] = useState(null) useEffect(() => { fetchUser(userId).then(setUser) // Missing userId dependency }, [])
} // Good: Include all dependencies
function GoodEffect({ userId }) { const [user, setUser] = useState(null) useEffect(() => { fetchUser(userId).then(setUser) // userId in dependency array }, [userId])
} // Problem: Object in dependency causing infinite re-renders
function BadObjectDep({ config }) { useEffect(() => { // config object changes reference every render doSomething(config) }, [config])
} // Solution: Use useMemo or destructure specific properties
function GoodObjectDep({ config }) { const { apiUrl, timeout } = config useEffect(() => { doSomething({ apiUrl, timeout }) }, [apiUrl, timeout])
}
``` ### 3. Key Prop Issues in Lists **Problem:** Incorrect key props causing render issues ```typescript
// Bad: Using array index as key
function BadList({ items }) { return ( <ul> {items.map((item, index) => ( <li key={index}>{item.name}</li> // Index as key ))} </ul> )
} // Good: Using unique identifier
function GoodList({ items }) { return ( <ul> {items.map(item => ( <li key={item.id}>{item.name}</li> // Unique ID as key ))} </ul> )
}
``` ### 4. Memory Leaks in useEffect **Problem:** Not cleaning up subscriptions or timers ```typescript
// Bad: No cleanup
function BadTimer() { const [count, setCount] = useState(0) useEffect(() => { const timer = setInterval(() => { setCount(c => c + 1) }, 1000) // No cleanup - memory leak }, [])
} // Good: Proper cleanup
function GoodTimer() { const [count, setCount] = useState(0) useEffect(() => { const timer = setInterval(() => { setCount(c => c + 1) }, 1000) return () => clearInterval(timer) // Cleanup }, [])
}
``` ## Build and Deployment Issues ### 1. Build Errors **Problem:** TypeScript or ESLint errors during build ```bash
# Check for type errors
npm run type-check # Fix ESLint issues
npm run lint -- --fix # Build with type checking disabled (not recommended)
npm run build -- --no-type-check
``` ### 2. Performance Issues **Problem:** Large bundle sizes or slow loading ```typescript
// Check bundle size
npm run build
npm run analyze # If you have bundle analyzer // Solutions:
// 1. Code splitting with dynamic imports
const LazyComponent = dynamic(() => import('./LazyComponent')) // 2. Use React.memo for expensive components
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) { // Expensive rendering logic
}) // 3. Optimize images
import Image from 'next/image'
// Use Image component with proper sizing
``` ### 3. Deployment Issues **Problem:** App works locally but fails in production ```typescript
// Common issues:
// 1. Environment variables not set in production
// 2. API routes expecting different base URLs
// 3. Static file paths incorrect // Solutions:
// 1. Check environment variables in deployment platform
// 2. Use relative URLs or environment-specific base URLs
// 3. Use Next.js built-in asset optimization
``` ## Performance Optimization ### 1. Optimize Re-renders ```typescript
// Use React.memo to prevent unnecessary re-renders
const OptimizedChild = memo(function ChildComponent({ value, onUpdate }) { return <div onClick={() => onUpdate(value)}>{value}</div>
}) // Use useCallback to stable callback functions
function Parent() { const [items, setItems] = useState([]) const handleUpdate = useCallback((value) => { setItems(prev => prev.map(item => item.id === value.id ? value : item )) }, []) return ( <div> {items.map(item => ( <OptimizedChild key={item.id} value={item} onUpdate={handleUpdate} /> ))} </div> )
}
``` ### 2. Optimize Bundle Size ```typescript
// Use dynamic imports for code splitting
import dynamic from 'next/dynamic' const HeavyComponent = dynamic(() => import('./HeavyComponent'), { loading: () => <p>Loading...</p>
}) // Tree shake unused code
import { specific } from 'library' // Good
import * as everything from 'library' // Bad
``` ### 3. Optimize Data Fetching ```typescript
// Use SWR or React Query for efficient data fetching
import useSWR from 'swr' function Profile({ userId }) { const { data, error, isLoading } = useSWR( `/api/user/${userId}`, fetch ) if (isLoading) return <div>Loading...</div> if (error) return <div>Error loading profile</div> return <div>Hello {data.name}</div>
}
``` ## Debugging Tips ### 1. React Developer Tools - Install React Developer Tools browser extension
- Use Profiler to identify performance bottlenecks
- Use Components tab to inspect props and state ### 2. Next.js Debugging ```typescript
// Enable debug mode
// next.config.js
module.exports = { experimental: { logging: { level: 'verbose' } }
} // Use console.log strategically
console.log('Component rendered with props:', props) // Use debugger statement
function Component() { debugger // Pauses execution in browser dev tools return <div>Content</div>
}
``` ### 3. Network Issues ```typescript
// Check API calls in browser Network tab
// Add request/response logging
export async function GET() { console.log('API route called') try { const result = await fetchData() console.log('API success:', result) return Response.json(result) } catch (error) { console.error('API error:', error) return Response.json({ error: error.message }, { status: 500 }) }
}
``` ## Best Practices Summary 1. **Always handle errors gracefully**
2. **Use TypeScript for better development experience**
3. **Implement proper loading states**
4. **Optimize images and assets**
5. **Use proper key props in lists**
6. **Clean up useEffect subscriptions**
7. **Minimize re-renders with React.memo and useCallback**
8. **Use environment variables properly**
9. **Test on different screen sizes and devices**
10. **Monitor bundle size and performance**
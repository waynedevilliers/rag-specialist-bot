# React Documentation - Core Concepts ## Components and JSX ### Function Components ```typescript
interface Props { name: string age?: number
} function Greeting({ name, age }: Props) { return ( <div> <h1>Hello, {name}!</h1> {age && <p>You are {age} years old.</p>} </div> )
}
``` ### JSX Rules - Return a single parent element or Fragment
- Close all tags (including self-closing tags like `<img />`)
- Use camelCase for attributes (`className` instead of `class`)
- Use curly braces for JavaScript expressions ```typescript
function App() { const isLoggedIn = true const items = ['apple', 'banana', 'orange'] return ( <> {isLoggedIn ? <Dashboard /> : <Login />} <ul> {items.map(item => ( <li key={item}>{item}</li> ))} </ul> </> )
}
``` ## State Management ### useState Hook ```typescript
import { useState } from 'react' function Counter() { const [count, setCount] = useState(0) const increment = () => setCount(count + 1) const decrement = () => setCount(prev => prev - 1) return ( <div> <p>Count: {count}</p> <button onClick={increment}>+</button> <button onClick={decrement}>-</button> </div> )
}
``` ### useReducer Hook ```typescript
import { useReducer } from 'react' interface State { count: number
} type Action = | { type: 'increment' } | { type: 'decrement' } | { type: 'reset' } function reducer(state: State, action: Action): State { switch (action.type) { case 'increment': return { count: state.count + 1 } case 'decrement': return { count: state.count - 1 } case 'reset': return { count: 0 } default: throw new Error() }
} function Counter() { const [state, dispatch] = useReducer(reducer, { count: 0 }) return ( <div> <p>Count: {state.count}</p> <button onClick={() => dispatch({ type: 'increment' })}>+</button> <button onClick={() => dispatch({ type: 'decrement' })}>-</button> <button onClick={() => dispatch({ type: 'reset' })}>Reset</button> </div> )
}
``` ## Effects and Lifecycle ### useEffect Hook ```typescript
import { useEffect, useState } from 'react' function UserProfile({ userId }: { userId: string }) { const [user, setUser] = useState(null) const [loading, setLoading] = useState(true) useEffect(() => { async function fetchUser() { try { const response = await fetch(`/api/users/${userId}`) const userData = await response.json() setUser(userData) } catch (error) { console.error('Failed to fetch user:', error) } finally { setLoading(false) } } fetchUser() }, [userId]) // Dependency array if (loading) return <div>Loading...</div> if (!user) return <div>User not found</div> return <div>Welcome, {user.name}!</div>
}
``` ### Cleanup Effects ```typescript
import { useEffect, useState } from 'react' function Timer() { const [seconds, setSeconds] = useState(0) useEffect(() => { const interval = setInterval(() => { setSeconds(prev => prev + 1) }, 1000) // Cleanup function return () => clearInterval(interval) }, []) return <div>Timer: {seconds}s</div>
}
``` ## Context API ### Creating Context ```typescript
import { createContext, useContext, useState, ReactNode } from 'react' interface ThemeContextType { theme: 'light' | 'dark' toggleTheme: () => void
} const ThemeContext = createContext<ThemeContextType | undefined>(undefined) export function ThemeProvider({ children }: { children: ReactNode }) { const [theme, setTheme] = useState<'light' | 'dark'>('light') const toggleTheme = () => { setTheme(prev => prev === 'light' ? 'dark' : 'light') } return ( <ThemeContext.Provider value={{ theme, toggleTheme }}> {children} </ThemeContext.Provider> )
} export function useTheme() { const context = useContext(ThemeContext) if (!context) { throw new Error('useTheme must be used within a ThemeProvider') } return context
}
``` ### Using Context ```typescript
function Header() { const { theme, toggleTheme } = useTheme() return ( <header className={theme === 'dark' ? 'dark-theme' : 'light-theme'}> <h1>My App</h1> <button onClick={toggleTheme}> Switch to {theme === 'light' ? 'dark' : 'light'} mode </button> </header> )
}
``` ## Performance Optimization ### React.memo ```typescript
import { memo } from 'react' interface Props { name: string count: number
} const ExpensiveComponent = memo(function ExpensiveComponent({ name, count }: Props) { // This component only re-renders when name or count changes return ( <div> <h2>{name}</h2> <p>Count: {count}</p> </div> )
})
``` ### useMemo Hook ```typescript
import { useMemo, useState } from 'react' function ExpensiveCalculation({ items }: { items: number[] }) { const [multiplier, setMultiplier] = useState(1) const expensiveValue = useMemo(() => { console.log('Calculating expensive value...') return items.reduce((sum, item) => sum + item * multiplier, 0) }, [items, multiplier]) return ( <div> <p>Result: {expensiveValue}</p> <button onClick={() => setMultiplier(m => m + 1)}> Increase multiplier </button> </div> )
}
``` ### useCallback Hook ```typescript
import { useCallback, useState } from 'react' function TodoList() { const [todos, setTodos] = useState([]) const [text, setText] = useState('') const addTodo = useCallback(() => { if (text.trim()) { setTodos(prev => [...prev, { id: Date.now(), text, completed: false }]) setText('') } }, [text]) const toggleTodo = useCallback((id: number) => { setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo )) }, []) return ( <div> <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add todo..." /> <button onClick={addTodo}>Add</button> {todos.map(todo => ( <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} /> ))} </div> )
}
``` ## Custom Hooks ### Creating Custom Hooks ```typescript
import { useState, useEffect } from 'react' function useLocalStorage<T>(key: string, initialValue: T) { const [storedValue, setStoredValue] = useState<T>(() => { try { const item = window.localStorage.getItem(key) return item ? JSON.parse(item) : initialValue } catch (error) { return initialValue } }) const setValue = (value: T | ((val: T) => T)) => { try { const valueToStore = value instanceof Function ? value(storedValue) : value setStoredValue(valueToStore) window.localStorage.setItem(key, JSON.stringify(valueToStore)) } catch (error) { console.error(error) } } return [storedValue, setValue] as const
} // Usage
function Settings() { const [theme, setTheme] = useLocalStorage('theme', 'light') return ( <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}> Current theme: {theme} </button> )
}
``` ### Data Fetching Hook ```typescript
import { useState, useEffect } from 'react' interface FetchState<T> { data: T | null loading: boolean error: string | null
} function useFetch<T>(url: string): FetchState<T> { const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null }) useEffect(() => { async function fetchData() { try { setState(prev => ({ ...prev, loading: true, error: null })) const response = await fetch(url) if (!response.ok) throw new Error('Failed to fetch') const data = await response.json() setState({ data, loading: false, error: null }) } catch (error) { setState({ data: null, loading: false, error: error.message }) } } fetchData() }, [url]) return state
}
``` ## Error Handling ### Error Boundaries ```typescript
import { Component, ReactNode } from 'react' interface Props { children: ReactNode fallback?: ReactNode
} interface State { hasError: boolean error?: Error
} class ErrorBoundary extends Component<Props, State> { constructor(props: Props) { super(props) this.state = { hasError: false } } static getDerivedStateFromError(error: Error): State { return { hasError: true, error } } componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('Error caught by boundary:', error, errorInfo) } render() { if (this.state.hasError) { return this.props.fallback || ( <div> <h2>Something went wrong.</h2> <details> {this.state.error?.message} </details> </div> ) } return this.props.children }
}
``` ## Forms and Input Handling ### Controlled Components ```typescript
import { useState, FormEvent } from 'react' interface FormData { name: string email: string message: string
} function ContactForm() { const [formData, setFormData] = useState<FormData>({ name: '', email: '', message: '' }) const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target setFormData(prev => ({ ...prev, [name]: value })) } const handleSubmit = (e: FormEvent) => { e.preventDefault() console.log('Form submitted:', formData) // Handle form submission } return ( <form onSubmit={handleSubmit}> <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" required /> <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required /> <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Message" rows={4} required /> <button type="submit">Send</button> </form> )
}
``` ## Testing ### Component Testing with React Testing Library ```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import Counter from './Counter' test('renders counter with initial value', () => { render(<Counter initialValue={5} />) expect(screen.getByText('Count: 5')).toBeInTheDocument()
}) test('increments counter when button clicked', () => { render(<Counter initialValue={0} />) const incrementButton = screen.getByText('+') fireEvent.click(incrementButton) expect(screen.getByText('Count: 1')).toBeInTheDocument()
})
``` ## TypeScript with React ### Component Props ```typescript
interface ButtonProps { children: React.ReactNode onClick: () => void variant?: 'primary' | 'secondary' disabled?: boolean
} function Button({ children, onClick, variant = 'primary', disabled = false }: ButtonProps) { return ( <button onClick={onClick} disabled={disabled} className={`btn btn-${variant}`} > {children} </button> )
}
``` ### Generic Components ```typescript
interface ListProps<T> { items: T[] renderItem: (item: T) => React.ReactNode keyExtractor: (item: T) => string | number
} function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) { return ( <ul> {items.map(item => ( <li key={keyExtractor(item)}> {renderItem(item)} </li> ))} </ul> )
} // Usage
const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] <List items={users} keyExtractor={user => user.id} renderItem={user => <span>{user.name}</span>}
/>
```
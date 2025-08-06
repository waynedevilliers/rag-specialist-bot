import * as React from "react"

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  return (
    <div className="relative">
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child as any, { value, onValueChange })
          : child
      )}
    </div>
  )
}

const SelectTrigger: React.FC<SelectTriggerProps & {value?: string, onValueChange?: (value: string) => void}> = ({ children, value, onValueChange }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {children}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          {React.Children.map(children, child => 
            React.isValidElement(child) && child.type === SelectContent
              ? React.cloneElement(child as any, { value, onValueChange, onClose: () => setIsOpen(false) })
              : null
          )}
        </div>
      )}
    </>
  )
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  return <span>{placeholder}</span>
}

const SelectContent: React.FC<SelectContentProps & {value?: string, onValueChange?: (value: string) => void, onClose?: () => void}> = ({ children, value, onValueChange, onClose }) => {
  return (
    <div className="p-1">
      {React.Children.map(children, child => 
        React.isValidElement(child)
          ? React.cloneElement(child as any, { currentValue: value, onValueChange, onClose })
          : child
      )}
    </div>
  )
}

const SelectItem: React.FC<SelectItemProps & {currentValue?: string, onValueChange?: (value: string) => void, onClose?: () => void}> = ({ value, children, currentValue, onValueChange, onClose }) => {
  return (
    <button
      type="button"
      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 ${
        currentValue === value ? 'bg-slate-100' : ''
      }`}
      onClick={() => {
        onValueChange?.(value)
        onClose?.()
      }}
    >
      {children}
    </button>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
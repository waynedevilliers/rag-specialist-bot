import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
}

const getAlertClasses = (variant: string = 'default') => {
  const baseClasses = "relative w-full rounded-lg border p-4"
  
  const variantClasses = {
    default: "bg-white text-gray-950 border-gray-200",
    destructive: "border-red-500 text-red-600 bg-red-50",
  }
  
  return `${baseClasses} ${variantClasses[variant as keyof typeof variantClasses]}`
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={`${getAlertClasses(variant)} ${className || ''}`}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm leading-relaxed ${className || ''}`}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }
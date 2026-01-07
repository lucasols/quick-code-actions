// Sample React component to test Quick Code Actions extension

import React from 'react'

// Test 1: Select this interface and extract
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

// Test 2: Select this component and extract to new file
function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors'

  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}

// Test 3: Select this hook and extract
function useCounter(initialValue = 0) {
  const [count, setCount] = React.useState(initialValue)

  const increment = () => setCount((c) => c + 1)
  const decrement = () => setCount((c) => c - 1)
  const reset = () => setCount(initialValue)

  return { count, increment, decrement, reset }
}

// Test 4: Select this utility function and extract
const classNames = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Main component using the above
export function App() {
  const { count, increment, decrement, reset } = useCounter(0)

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Counter: {count}</h1>
      <div className="flex gap-2">
        <Button label="Increment" onClick={increment} variant="primary" />
        <Button label="Decrement" onClick={decrement} variant="secondary" />
        <Button label="Reset" onClick={reset} variant="danger" />
      </div>
    </div>
  )
}

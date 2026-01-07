// Sample file to test Quick Code Actions extension

// Test 1: Select this function and use "Extract to new file"
function calculateTotal(items: { price: number; quantity: number }[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// Test 2: Select this class and use "Extract to new file"
class UserService {
  private users: Map<string, { name: string; email: string }> = new Map()

  addUser(id: string, name: string, email: string) {
    this.users.set(id, { name, email })
  }

  getUser(id: string) {
    return this.users.get(id)
  }

  removeUser(id: string) {
    return this.users.delete(id)
  }
}

// Test 3: Select this interface and use "Extract to new file"
interface ApiResponse<T> {
  data: T
  status: number
  message: string
  timestamp: Date
}

// Test 4: Select this type and use "Extract to new file"
type AsyncHandler<T> = (input: T) => Promise<void>

// Test 5: Select this const and use "Extract to new file"
const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Test 6: Select multiple lines (lines 45-55) and use "Copy Reference"
// Expected output: @sample.ts#L45-55
async function fetchUserData(userId: string) {
  const response = await fetch(`/api/users/${userId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}

// Usage examples
const items = [
  { price: 10, quantity: 2 },
  { price: 25, quantity: 1 },
]

const total = calculateTotal(items)
console.log(formatCurrency(total))

const userService = new UserService()
userService.addUser('1', 'John Doe', 'john@example.com')

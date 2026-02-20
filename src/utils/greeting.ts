/**
 * Time-based greeting for dashboard (matches frontend "Hi, {name}" style).
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Full greeting line: "Good morning, John" or "Hi, John"
 */
export function getGreetingLine(name: string, useTimeBased = true): string {
  const prefix = useTimeBased ? getTimeBasedGreeting() : 'Hi'
  return `${prefix}, ${name}`
}

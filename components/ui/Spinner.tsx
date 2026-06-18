'use client'

const sizeMap = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
} as const

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const dim = sizeMap[size]

  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: dim, height: dim }}
      className="inline-block rounded-full border-2 border-border border-t-primary motion-safe:animate-spin shrink-0"
    />
  )
}

export default Spinner

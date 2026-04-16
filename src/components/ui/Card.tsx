import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-[#3a2a1a] border border-[#1a100a] p-4 shadow-[1px_1px_0_#1a100a] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
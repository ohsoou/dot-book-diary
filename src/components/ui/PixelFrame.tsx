import { type HTMLAttributes } from 'react'

interface PixelFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PixelFrame({ children, className = '', ...props }: PixelFrameProps) {
  return (
    <div
      className={`outline outline-1 outline-[#1a100a] outline-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
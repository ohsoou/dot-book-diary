import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text'
type ButtonSize = 'default' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  pending?: boolean
  size?: ButtonSize
  pendingLabel?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] hover:bg-[#f0a96c] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-transparent border border-[#8b6f4a] text-[#d7c199] hover:border-[#e89b5e] hover:text-[#f4e4c1] disabled:opacity-40 disabled:cursor-not-allowed',
  danger:
    'bg-transparent border border-[#c85a54] text-[#c85a54] hover:bg-[#c85a54] hover:text-[#f4e4c1] disabled:opacity-40 disabled:cursor-not-allowed',
  text: 'text-[#d7c199] hover:text-[#f4e4c1] underline-offset-2 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-3 py-2',
  sm: 'px-2 py-1',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    pending = false,
    size = 'default',
    pendingLabel,
    children,
    disabled,
    className = '',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || pending

  return (
    <button
      ref={ref}
      {...props}
      disabled={isDisabled}
      className={`text-sm transition-colors duration-100 ease-linear ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {pending ? (pendingLabel ?? '처리 중...') : children}
    </button>
  )
})
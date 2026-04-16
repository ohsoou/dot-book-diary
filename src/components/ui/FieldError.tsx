interface FieldErrorProps {
  message: string | undefined
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p className="mt-1 text-xs text-[#c85a54]" role="alert">
      {message}
    </p>
  )
}
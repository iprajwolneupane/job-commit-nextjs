import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function SecureInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [isVisible, setIsVisible] = React.useState(false)
  const inputType = isVisible ? 'text' : 'password'
  const label = isVisible ? 'Hide password' : 'Show password'
  const Icon = isVisible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        type={inputType}
        disabled={disabled}
        className={cn('pr-10', className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={() => setIsVisible((value) => !value)}
        className="absolute top-1/2 right-1 size-8 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground"
      >
        <Icon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}

export { SecureInput }

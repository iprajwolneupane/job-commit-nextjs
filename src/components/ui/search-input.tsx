'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  placeholder: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  inputClassName?: string
  disabled?: boolean
  debounce?: boolean
  isNumberInput?: boolean
}

export default function SearchInput({
  placeholder,
  value = '',
  onValueChange,
  className = '',
  inputClassName = '',
  disabled = false,
  debounce = false,
  isNumberInput = false,
}: Props) {
  const [search, setSearch] = useState(value)

  useEffect(() => {
    setSearch(value)
  }, [value])

  useEffect(() => {
    if (!debounce) {
      onValueChange?.(search)
      return
    }

    const timerId = setTimeout(() => onValueChange?.(search), 500)

    return () => clearTimeout(timerId)
  }, [debounce, onValueChange, search])

  return (
    <div className={cn('relative flex items-center', className)}>
      <Input
        type={isNumberInput ? 'number' : 'text'}
        placeholder={placeholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        spellCheck="false"
        className={cn('bg-background px-10 shadow-none h-8', inputClassName)}
        disabled={disabled}
      />
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 size-5 text-muted-foreground"
      />
      {search ? (
        <button
          type="button"
          className="absolute right-2.5 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setSearch('')}
          disabled={disabled}
          aria-label="Clear search"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      ) : null}
    </div>
  )
}

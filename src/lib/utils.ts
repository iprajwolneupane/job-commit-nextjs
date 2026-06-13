import type { AxiosError } from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

type ApiErrorResponse = {
  message?: string
  errors?: Record<string, Array<string> | undefined>
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function handleError<T extends ApiErrorResponse>(error: AxiosError<T>) {
  const response = error.response?.data

  if (response?.errors) {
    for (const messages of Object.values(response.errors)) {
      const message = messages?.[0]

      if (message) {
        toast.error(message)
      }
    }
  }
  if (response?.message) {
    toast.error(response.message)
    return
  }

  toast.error('Something went wrong')
}

'use client'

import { NotFoundSVG } from '@/components/svg'
import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'

type ErrorResponse = {
    message?: string
    errors?: Record<string, Array<string> | undefined>
}

type ErrorState = {
    statusCode: number | null
    message: string
}

const DEFAULT_ERROR_STATE: ErrorState = {
    statusCode: null,
    message: 'Something went wrong',
}

function getFirstFieldError(errors?: ErrorResponse['errors']) {
    if (!errors) return null

    for (const messages of Object.values(errors)) {
        const message = messages?.[0]

        if (message) {
            return message
        }
    }

    return null
}

function getErrorState(error: unknown): ErrorState {
    if (isAxiosError<ErrorResponse>(error)) {
        const response = error.response
        const data = response?.data

        return {
            statusCode: response?.status ?? null,
            message:
                getFirstFieldError(data?.errors) ??
                data?.message ??
                error.message ??
                DEFAULT_ERROR_STATE.message,
        }
    }

    if (error instanceof Error) {
        return {
            statusCode: null,
            message: error.message || DEFAULT_ERROR_STATE.message,
        }
    }

    return DEFAULT_ERROR_STATE
}

export default function ErrorComponent({ error }: { error: unknown }) {
    const [trackedError, setTrackedError] = useState<ErrorState>(() =>
        getErrorState(error),
    )

    useEffect(() => {
        setTrackedError(getErrorState(error))
    }, [error])

    const isNotFound = trackedError.statusCode === 404
    const statusLabel = trackedError.statusCode
        ? `Error ${trackedError.statusCode}`
        : 'Error'
    const title = isNotFound ? 'Page not found' : 'Unable to load this page'

    return (
        <div
            role="alert"
            className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center"
        >

            <p className="mt-6 text-sm font-semibold text-primary">
                {statusLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                {trackedError.message}
            </p>
        </div>
    )
}

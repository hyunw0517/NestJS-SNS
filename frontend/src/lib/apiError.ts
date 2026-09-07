import { isAxiosError } from 'axios'

export function getErrorMessage(err: unknown, fallback: string) {
  if (isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data
    return Array.isArray(message) ? message.join(' ') : message
  }

  return fallback
}

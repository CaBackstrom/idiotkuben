/* eslint-disable @typescript-eslint/no-explicit-any */
export function track(event: string, data?: Record<string, string>): void {
  if (typeof window !== 'undefined' && typeof (window as any).cf_beacon === 'function') {
    (window as any).cf_beacon('event', { name: event, ...data })
  }
}

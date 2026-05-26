import type { MonitoredEvent } from '../types/event'

export const MONITOR_API_BASE_URL =
  import.meta.env.VITE_MONITOR_API_BASE_URL ?? 'http://localhost:8090'

export const MONITOR_EVENTS_STREAM_URL = buildMonitorUrl('/api/events/stream')

export async function getMonitoredEvents(): Promise<MonitoredEvent[]> {
  const response = await fetch(buildMonitorUrl('/api/events'))

  if (!response.ok) {
    throw new Error(`Monitor API request failed with status ${response.status}`)
  }

  return response.json() as Promise<MonitoredEvent[]>
}

function buildMonitorUrl(endpoint: string) {
  return `${MONITOR_API_BASE_URL.replace(/\/$/, '')}${endpoint}`
}

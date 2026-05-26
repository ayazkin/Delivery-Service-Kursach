import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getMonitoredEvents,
  MONITOR_API_BASE_URL,
  MONITOR_EVENTS_STREAM_URL,
} from '../api/events'
import { Button, ErrorMessage, Loading } from '../components'
import type { MonitoredEvent } from '../types/event'
import { formatDate, formatShortId } from '../utils/format'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
type EventFilter = 'all' | string

const eventTypeLabels: Record<string, string> = {
  'order.created': 'Заказ создан',
  'order.status_changed': 'Статус заказа',
  'courier.assigned': 'Курьер назначен',
  'courier.status_changed': 'Статус курьера',
  'location.updated': 'Координаты',
}

const topicLabels: Record<string, string> = {
  couriers: 'Курьеры',
  locations: 'Координаты',
  orders: 'Заказы',
}

export function EventMonitorPage() {
  const [liveEvents, setLiveEvents] = useState<MonitoredEvent[]>([])
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<EventFilter>('all')
  const [topicFilter, setTopicFilter] = useState<EventFilter>('all')
  const [isCleared, setIsCleared] = useState(false)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting')

  const eventsQuery = useQuery({
    queryKey: ['monitor-events'],
    queryFn: getMonitoredEvents,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    const source = new EventSource(MONITOR_EVENTS_STREAM_URL)

    source.onopen = () => {
      setConnectionStatus('connected')
    }

    source.onerror = () => {
      setConnectionStatus('disconnected')
    }

    source.addEventListener('delivery-event', (message) => {
      const event = JSON.parse(message.data) as MonitoredEvent

      setLiveEvents((current) => {
        const next = [
          ...current.filter((item) => getEventKey(item) !== getEventKey(event)),
          event,
        ]
        return next.slice(-100)
      })
      setSelectedEventKey(getEventKey(event))
      setConnectionStatus('connected')
    })

    return () => {
      source.close()
    }
  }, [])

  const events = useMemo(
    () => mergeEvents(isCleared ? [] : eventsQuery.data ?? [], liveEvents),
    [eventsQuery.data, isCleared, liveEvents],
  )

  const sortedEvents = useMemo(() => [...events].reverse(), [events])

  const selectedEvent = useMemo(
    () =>
      events.find((event) => getEventKey(event) === selectedEventKey) ??
      events.at(-1) ??
      null,
    [events, selectedEventKey],
  )

  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((event) => event.type))).sort(),
    [events],
  )

  const topics = useMemo(
    () => Array.from(new Set(events.map((event) => event.topic))).sort(),
    [events],
  )

  const filteredEvents = useMemo(
    () =>
      sortedEvents.filter((event) => {
        const matchesType = typeFilter === 'all' || event.type === typeFilter
        const matchesTopic = topicFilter === 'all' || event.topic === topicFilter
        return matchesType && matchesTopic
      }),
    [sortedEvents, topicFilter, typeFilter],
  )

  const eventCounters = useMemo(
    () => ({
      couriers: events.filter((event) => event.topic === 'couriers').length,
      locations: events.filter((event) => event.topic === 'locations').length,
      orders: events.filter((event) => event.topic === 'orders').length,
      total: events.length,
    }),
    [events],
  )

  return (
    <section className="page monitor-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Kafka event stream</p>
          <h1>Мониторинг событий</h1>
        </div>

        <div className="monitor-connection">
          <span className={`monitor-connection-dot monitor-connection-${connectionStatus}`} />
          <span>{getConnectionLabel(connectionStatus)}</span>
          <small>{MONITOR_API_BASE_URL}</small>
        </div>
      </div>

      <div className="monitor-stats">
        <Metric label="Всего" value={eventCounters.total} />
        <Metric label="Заказы" value={eventCounters.orders} />
        <Metric label="Курьеры" value={eventCounters.couriers} />
        <Metric label="Координаты" value={eventCounters.locations} />
      </div>

      <div className="monitor-toolbar">
        <label className="form-label" htmlFor="event-type-filter">
          Тип
        </label>
        <select
          className="form-select filter-select"
          id="event-type-filter"
          onChange={(event) => setTypeFilter(event.target.value)}
          value={typeFilter}
        >
          <option value="all">Все</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {getEventTypeLabel(type)}
            </option>
          ))}
        </select>

        <label className="form-label" htmlFor="event-topic-filter">
          Топик
        </label>
        <select
          className="form-select filter-select"
          id="event-topic-filter"
          onChange={(event) => setTopicFilter(event.target.value)}
          value={topicFilter}
        >
          <option value="all">Все</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {getTopicLabel(topic)}
            </option>
          ))}
        </select>

        <Button
          disabled={events.length === 0}
          onClick={() => {
            setIsCleared(true)
            setLiveEvents([])
            setSelectedEventKey(null)
          }}
          variant="ghost"
        >
          Очистить экран
        </Button>
      </div>

      {eventsQuery.isLoading && (
        <div className="panel">
          <Loading label="Загружаем события Kafka..." />
        </div>
      )}

      {eventsQuery.isError && (
        <ErrorMessage message={getErrorMessage(eventsQuery.error)} />
      )}

      <div className="monitor-grid">
        <div className="table-wrapper monitor-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Тип</th>
                <th>Топик</th>
                <th>Partition</th>
                <th>Offset</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td className="table-empty" colSpan={6}>
                    Событий пока нет
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr
                    className={
                      selectedEvent && getEventKey(selectedEvent) === getEventKey(event)
                        ? 'monitor-row-active'
                        : undefined
                    }
                    key={getEventKey(event)}
                    onClick={() => setSelectedEventKey(getEventKey(event))}
                  >
                    <td>{formatDate(event.timestamp)}</td>
                    <td>
                      <span className={`event-type event-type-${getEventTone(event.type)}`}>
                        {getEventTypeLabel(event.type)}
                      </span>
                    </td>
                    <td>{getTopicLabel(event.topic)}</td>
                    <td>{event.partition}</td>
                    <td>{event.offset}</td>
                    <td>{formatShortId(event.id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <aside className="panel monitor-details">
          <div className="section-header">
            <h2>Payload</h2>
          </div>

          {selectedEvent ? (
            <>
              <dl className="details-list monitor-details-list">
                <div>
                  <dt>Тип</dt>
                  <dd>{getEventTypeLabel(selectedEvent.type)}</dd>
                </div>
                <div>
                  <dt>Топик</dt>
                  <dd>{getTopicLabel(selectedEvent.topic)}</dd>
                </div>
                <div>
                  <dt>Offset</dt>
                  <dd>
                    {selectedEvent.partition}:{selectedEvent.offset}
                  </dd>
                </div>
              </dl>

              <pre className="json-view">
                {JSON.stringify(selectedEvent.data, null, 2)}
              </pre>
            </>
          ) : (
            <p className="muted-message">Выберите событие в таблице</p>
          )}
        </aside>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="monitor-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getConnectionLabel(status: ConnectionStatus) {
  if (status === 'connected') {
    return 'Stream online'
  }

  if (status === 'disconnected') {
    return 'Stream reconnecting'
  }

  return 'Stream connecting'
}

function getEventKey(event: MonitoredEvent) {
  return `${event.topic}:${event.partition}:${event.offset}:${event.id}`
}

function mergeEvents(history: MonitoredEvent[], live: MonitoredEvent[]) {
  const merged = new Map<string, MonitoredEvent>()

  for (const event of history) {
    merged.set(getEventKey(event), event)
  }

  for (const event of live) {
    merged.set(getEventKey(event), event)
  }

  return Array.from(merged.values()).slice(-100)
}

function getEventTypeLabel(type: string) {
  return eventTypeLabels[type] ?? type
}

function getTopicLabel(topic: string) {
  return topicLabels[topic] ?? topic
}

function getEventTone(type: string) {
  if (type.includes('created')) {
    return 'success'
  }

  if (type.includes('location')) {
    return 'info'
  }

  if (type.includes('assigned')) {
    return 'accent'
  }

  return 'neutral'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла ошибка'
}

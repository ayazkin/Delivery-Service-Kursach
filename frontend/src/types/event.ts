export type EventTopic = 'orders' | 'couriers' | 'locations'

export type DeliveryEventType =
  | 'order.created'
  | 'order.status_changed'
  | 'courier.assigned'
  | 'courier.status_changed'
  | 'location.updated'

export type MonitoredEvent = {
  id: string
  type: DeliveryEventType | string
  timestamp: string
  topic: EventTopic | string
  partition: number
  offset: number
  data: unknown
}

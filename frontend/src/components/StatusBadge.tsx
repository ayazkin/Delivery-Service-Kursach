import type { CourierStatus } from '../types/courier'
import type { OrderStatus } from '../types/order'

type Status = OrderStatus | CourierStatus

type StatusBadgeProps = {
  status: Status
}

const statusLabels: Record<Status, string> = {
  accepted: 'Принят',
  available: 'Доступен',
  busy: 'Занят',
  cancelled: 'Отменен',
  created: 'Создан',
  delivered: 'Доставлен',
  in_delivery: 'В доставке',
  offline: 'Офлайн',
  preparing: 'Готовится',
  ready: 'Готов',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const toneClass = status.replaceAll('_', '-')

  return (
    <span className={`status-badge status-${toneClass}`}>
      {statusLabels[status]}
    </span>
  )
}

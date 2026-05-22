import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrderById, updateOrderStatus } from '../api/orders'
import { Button, ErrorMessage, Loading, StatusBadge } from '../components'
import type { OrderStatus } from '../types/order'

const orderStatusOptions: Array<{
  label: string
  value: OrderStatus
}> = [
  { label: 'Создан', value: 'created' },
  { label: 'Принят', value: 'accepted' },
  { label: 'Готовится', value: 'preparing' },
  { label: 'Готов', value: 'ready' },
  { label: 'В доставке', value: 'in_delivery' },
  { label: 'Доставлен', value: 'delivered' },
  { label: 'Отменен', value: 'cancelled' },
]

export function OrderDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('')

  const orderQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['order', id],
    queryFn: () => getOrderById(id ?? ''),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id ?? '', { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const order = orderQuery.data
  const currentStatus = order?.status
  const statusValue = selectedStatus || currentStatus || 'created'

  const onUpdateStatus = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedStatus || selectedStatus === currentStatus) {
      return
    }

    updateStatusMutation.mutate(selectedStatus)
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Заказ #{id}</p>
          <h1>Детали заказа</h1>
        </div>
        <Link className="text-link" to="/orders">
          К списку заказов
        </Link>
      </div>

      {!id && <ErrorMessage message="Не указан идентификатор заказа" />}

      {orderQuery.isLoading && (
        <div className="panel">
          <Loading label="Загружаем заказ..." />
        </div>
      )}

      {orderQuery.isError && (
        <ErrorMessage message={getErrorMessage(orderQuery.error)} />
      )}

      {updateStatusMutation.isError && (
        <ErrorMessage message={getErrorMessage(updateStatusMutation.error)} />
      )}

      {order && (
        <div className="details-grid">
          <div className="content-stack">
            <div className="card">
              <div className="section-header">
                <h2>Клиент</h2>
              </div>
              <dl className="details-list">
                <div>
                  <dt>Имя</dt>
                  <dd>{order.customer_name}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd>{order.customer_phone}</dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <div className="section-header">
                <h2>Адрес доставки</h2>
              </div>
              <p>{order.delivery_address}</p>
            </div>

            <div className="card">
              <div className="section-header">
                <h2>Товары</h2>
              </div>
              <div className="table-wrapper table-wrapper-flat">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Количество</th>
                      <th>Цена</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items ?? []).length === 0 ? (
                      <tr>
                        <td className="table-empty" colSpan={4}>
                          Товары не найдены.
                        </td>
                      </tr>
                    ) : (
                      (order.items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{formatMoney(item.price)}</td>
                          <td>{formatMoney(item.price * item.quantity)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="card details-summary">
            <div className="section-header">
              <h2>Состояние</h2>
            </div>

            <dl className="details-list">
              <div>
                <dt>Текущий статус</dt>
                <dd>
                  <StatusBadge status={order.status} />
                </dd>
              </div>
              <div>
                <dt>Итоговая сумма</dt>
                <dd className="summary-total">{formatMoney(order.total_amount)}</dd>
              </div>
              <div>
                <dt>Курьер</dt>
                <dd>{order.courier_id ? order.courier_id.slice(0, 8) : '-'}</dd>
              </div>
              <div>
                <dt>Создан</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
            </dl>

            <form className="form status-form" onSubmit={onUpdateStatus}>
              <div className="form-row">
                <label className="form-label" htmlFor="order-status">
                  Сменить статус
                </label>
                <select
                  className="form-select"
                  id="order-status"
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as OrderStatus)
                  }
                  value={statusValue}
                >
                  {orderStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                disabled={
                  updateStatusMutation.isPending ||
                  !selectedStatus ||
                  selectedStatus === currentStatus
                }
                type="submit"
              >
                {updateStatusMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </aside>
        </div>
      )}
    </section>
  )
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    style: 'currency',
  }).format(value)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла ошибка'
}

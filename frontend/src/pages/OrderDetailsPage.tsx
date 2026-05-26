import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignOrderToCourier,
  getAvailableCouriers,
  getCourierById,
} from '../api/couriers'
import { getOrderById, updateOrderStatus } from '../api/orders'
import { Button, ErrorMessage, Loading, StatusBadge } from '../components'
import type { OrderStatus } from '../types/order'
import { formatDate, formatMoney, formatShortId } from '../utils/format'

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
  const [selectedCourierId, setSelectedCourierId] = useState('')

  const orderQuery = useQuery({
    enabled: Boolean(id),
    queryKey: ['order', id],
    queryFn: () => getOrderById(id ?? ''),
  })

  const order = orderQuery.data
  const currentStatus = order?.status
  const canAssignCourier = currentStatus === 'created'

  const availableCouriersQuery = useQuery({
    enabled: Boolean(id) && canAssignCourier,
    queryKey: ['couriers', 'available'],
    queryFn: getAvailableCouriers,
  })

  const assignedCourierQuery = useQuery({
    enabled: Boolean(order?.courier_id),
    queryKey: ['courier', order?.courier_id],
    queryFn: () => getCourierById(order?.courier_id ?? ''),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id ?? '', { status }),
    onSuccess: async () => {
      setSelectedStatus('')
      await queryClient.invalidateQueries({ queryKey: ['order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const assignCourierMutation = useMutation({
    mutationFn: (courierId: string) =>
      assignOrderToCourier(courierId, { order_id: id ?? '' }),
    onSuccess: async () => {
      setSelectedCourierId('')
      await queryClient.invalidateQueries({ queryKey: ['order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['couriers'] })
      await queryClient.invalidateQueries({ queryKey: ['courier'] })
    },
  })

  const statusValue = selectedStatus || currentStatus || 'created'

  const onUpdateStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedStatus || selectedStatus === currentStatus) {
      return
    }

    updateStatusMutation.mutate(selectedStatus)
  }

  const onAssignCourier = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCourierId) {
      return
    }

    assignCourierMutation.mutate(selectedCourierId)
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

      {assignCourierMutation.isError && (
        <ErrorMessage message={getErrorMessage(assignCourierMutation.error)} />
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
                          Товаров пока нет
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
                <dd>
                  {order.courier_id
                    ? getCourierDisplayName(
                        assignedCourierQuery.data?.name,
                        assignedCourierQuery.isLoading,
                        order.courier_id,
                      )
                    : '-'}
                </dd>
              </div>
              <div>
                <dt>Создан</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
            </dl>

            <div className="assignment-block">
              <div className="section-header">
                <h2>Назначение курьера</h2>
              </div>

              {!canAssignCourier && (
                <p className="muted-message">
                  Назначение доступно только для заказа в статусе «Создан».
                  Текущий backend назначает курьера и переводит заказ в
                  «Принят» одной операцией.
                </p>
              )}

              {canAssignCourier && availableCouriersQuery.isLoading && (
                <Loading label="Ищем доступных курьеров..." />
              )}

              {canAssignCourier && availableCouriersQuery.isError && (
                <ErrorMessage
                  message={getErrorMessage(availableCouriersQuery.error)}
                />
              )}

              {canAssignCourier &&
                availableCouriersQuery.isSuccess &&
                availableCouriersQuery.data.length === 0 && (
                  <p className="muted-message">Доступных курьеров нет.</p>
                )}

              {canAssignCourier &&
                availableCouriersQuery.isSuccess &&
                availableCouriersQuery.data.length > 0 && (
                  <form className="form" onSubmit={onAssignCourier}>
                    <div className="form-row">
                      <label className="form-label" htmlFor="available-courier">
                        Доступный курьер
                      </label>
                      <select
                        className="form-select"
                        disabled={assignCourierMutation.isPending}
                        id="available-courier"
                        onChange={(event) =>
                          setSelectedCourierId(event.target.value)
                        }
                        value={selectedCourierId}
                      >
                        <option value="">Выберите курьера</option>
                        {availableCouriersQuery.data.map((courier) => (
                          <option key={courier.id} value={courier.id}>
                            {courier.name} / {courier.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      disabled={
                        assignCourierMutation.isPending || !selectedCourierId
                      }
                      type="submit"
                    >
                      {assignCourierMutation.isPending
                        ? 'Назначение...'
                        : 'Назначить'}
                    </Button>
                  </form>
                )}
            </div>

            <form className="form status-form" onSubmit={onUpdateStatus}>
              <div className="form-row">
                <label className="form-label" htmlFor="order-status">
                  Сменить статус
                </label>
                <select
                  className="form-select"
                  disabled={updateStatusMutation.isPending}
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла ошибка'
}

function getCourierDisplayName(
  name: string | undefined,
  isLoading: boolean,
  courierId: string,
) {
  if (name) {
    return name
  }

  if (isLoading) {
    return 'Загрузка...'
  }

  return formatShortId(courierId)
}

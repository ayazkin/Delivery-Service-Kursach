import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { createOrder, getOrders } from '../api/orders'
import { Button, ErrorMessage, Loading, StatusBadge } from '../components'
import type { CreateOrderRequest, OrderStatus } from '../types/order'
import { formatDate, formatMoney, formatShortId } from '../utils/format'

type OrderStatusFilter = 'all' | OrderStatus

const statusFilterOptions: Array<{
  label: string
  value: OrderStatusFilter
}> = [
  { label: 'Все', value: 'all' },
  { label: 'Создан', value: 'created' },
  { label: 'Принят', value: 'accepted' },
  { label: 'Готовится', value: 'preparing' },
  { label: 'Готов', value: 'ready' },
  { label: 'В доставке', value: 'in_delivery' },
  { label: 'Доставлен', value: 'delivered' },
  { label: 'Отменен', value: 'cancelled' },
]

const emptyOrderItem = {
  name: '',
  quantity: 1,
  price: 0,
}

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateOrderRequest>({
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      delivery_address: '',
      items: [{ ...emptyOrderItem }],
    },
  })

  const { append, fields, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const ordersQuery = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => getOrders(statusFilter === 'all' ? {} : { status: statusFilter }),
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async () => {
      setFormError(null)
      reset({
        customer_name: '',
        customer_phone: '',
        delivery_address: '',
        items: [{ ...emptyOrderItem }],
      })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const onCreateOrder = (data: CreateOrderRequest) => {
    if (data.items.length === 0) {
      setFormError('Добавьте хотя бы один товар')
      return
    }

    setFormError(null)
    createOrderMutation.mutate(data)
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Оформление доставок</p>
          <h1>Заказы</h1>
        </div>
      </div>

      <div className="page-grid">
        <div className="card">
          <div className="section-header">
            <h2>Новый заказ</h2>
          </div>

          <form className="form" onSubmit={handleSubmit(onCreateOrder)}>
            <div className="form-row">
              <label className="form-label" htmlFor="customer-name">
                Клиент
              </label>
              <input
                className="form-input"
                disabled={createOrderMutation.isPending}
                id="customer-name"
                {...register('customer_name', { required: 'Укажите клиента' })}
              />
              {errors.customer_name && (
                <span className="field-error">{errors.customer_name.message}</span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="customer-phone">
                Телефон
              </label>
              <input
                className="form-input"
                disabled={createOrderMutation.isPending}
                id="customer-phone"
                {...register('customer_phone', { required: 'Укажите телефон' })}
              />
              {errors.customer_phone && (
                <span className="field-error">
                  {errors.customer_phone.message}
                </span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="delivery-address">
                Адрес
              </label>
              <textarea
                className="form-textarea"
                disabled={createOrderMutation.isPending}
                id="delivery-address"
                {...register('delivery_address', { required: 'Укажите адрес' })}
              />
              {errors.delivery_address && (
                <span className="field-error">
                  {errors.delivery_address.message}
                </span>
              )}
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <span className="form-label">Товары</span>
                <Button
                  disabled={createOrderMutation.isPending}
                  onClick={() => {
                    setFormError(null)
                    append({ ...emptyOrderItem })
                  }}
                  type="button"
                  variant="secondary"
                >
                  Добавить товар
                </Button>
              </div>

              <div className="order-items">
                {fields.map((field, index) => (
                  <div className="order-item" key={field.id}>
                    <div className="form-row">
                      <label className="form-label" htmlFor={`item-name-${field.id}`}>
                        Название
                      </label>
                      <input
                        className="form-input"
                        disabled={createOrderMutation.isPending}
                        id={`item-name-${field.id}`}
                        {...register(`items.${index}.name`, {
                          required: 'Укажите товар',
                        })}
                      />
                      {errors.items?.[index]?.name && (
                        <span className="field-error">
                          {errors.items[index]?.name?.message}
                        </span>
                      )}
                    </div>

                    <div className="form-row order-item-number">
                      <label
                        className="form-label"
                        htmlFor={`item-quantity-${field.id}`}
                      >
                        Кол-во
                      </label>
                      <input
                        className="form-input"
                        disabled={createOrderMutation.isPending}
                        id={`item-quantity-${field.id}`}
                        min={1}
                        type="number"
                        {...register(`items.${index}.quantity`, {
                          min: {
                            message: 'Минимум 1',
                            value: 1,
                          },
                          required: 'Укажите количество',
                          valueAsNumber: true,
                        })}
                      />
                      {errors.items?.[index]?.quantity && (
                        <span className="field-error">
                          {errors.items[index]?.quantity?.message}
                        </span>
                      )}
                    </div>

                    <div className="form-row order-item-number">
                      <label className="form-label" htmlFor={`item-price-${field.id}`}>
                        Цена
                      </label>
                      <input
                        className="form-input"
                        disabled={createOrderMutation.isPending}
                        id={`item-price-${field.id}`}
                        min={0}
                        step="0.01"
                        type="number"
                        {...register(`items.${index}.price`, {
                          min: {
                            message: 'Не меньше 0',
                            value: 0,
                          },
                          required: 'Укажите цену',
                          valueAsNumber: true,
                        })}
                      />
                      {errors.items?.[index]?.price && (
                        <span className="field-error">
                          {errors.items[index]?.price?.message}
                        </span>
                      )}
                    </div>

                    <Button
                      disabled={createOrderMutation.isPending}
                      onClick={() => remove(index)}
                      type="button"
                      variant="danger"
                    >
                      Удалить товар
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {formError && <ErrorMessage message={formError} />}

            {createOrderMutation.isError && (
              <ErrorMessage message={getErrorMessage(createOrderMutation.error)} />
            )}

            <div className="form-actions">
              <Button disabled={createOrderMutation.isPending} type="submit">
                {createOrderMutation.isPending ? 'Создание...' : 'Создать заказ'}
              </Button>
            </div>
          </form>
        </div>

        <div className="content-stack">
          <div className="toolbar">
            <label className="form-label" htmlFor="order-status-filter">
              Статус
            </label>
            <select
              className="form-select filter-select"
              id="order-status-filter"
              onChange={(event) =>
                setStatusFilter(event.target.value as OrderStatusFilter)
              }
              value={statusFilter}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {ordersQuery.isLoading && (
            <div className="panel">
              <Loading label="Загружаем заказы..." />
            </div>
          )}

          {ordersQuery.isError && (
            <ErrorMessage message={getErrorMessage(ordersQuery.error)} />
          )}

          {ordersQuery.isSuccess && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Клиент</th>
                    <th>Телефон</th>
                    <th>Адрес</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Курьер</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data.length === 0 ? (
                    <tr>
                      <td className="table-empty" colSpan={7}>
                        Заказов пока нет
                      </td>
                    </tr>
                  ) : (
                    ordersQuery.data.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link className="text-link" to={`/orders/${order.id}`}>
                            {order.customer_name}
                          </Link>
                        </td>
                        <td>{order.customer_phone}</td>
                        <td>{order.delivery_address}</td>
                        <td>{formatMoney(order.total_amount)}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td>{formatShortId(order.courier_id)}</td>
                        <td>{formatDate(order.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла ошибка'
}

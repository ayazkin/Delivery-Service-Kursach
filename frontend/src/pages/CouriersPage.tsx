import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { createCourier, getCouriers, updateCourierStatus } from '../api/couriers'
import { Button, ErrorMessage, Loading, StatusBadge } from '../components'
import type {
  CourierStatus,
  CreateCourierRequest,
} from '../types/courier'

type CourierStatusFilter = 'all' | CourierStatus

type UpdateCourierStatusVariables = {
  courierId: string
  status: CourierStatus
}

const statusFilterOptions: Array<{
  label: string
  value: CourierStatusFilter
}> = [
  { label: 'Все', value: 'all' },
  { label: 'Офлайн', value: 'offline' },
  { label: 'Доступен', value: 'available' },
  { label: 'Занят', value: 'busy' },
]

const courierStatusOptions: Array<{
  label: string
  value: CourierStatus
}> = [
  { label: 'Офлайн', value: 'offline' },
  { label: 'Доступен', value: 'available' },
  { label: 'Занят', value: 'busy' },
]

export function CouriersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<CourierStatusFilter>('all')

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateCourierRequest>({
    defaultValues: {
      name: '',
      phone: '',
    },
  })

  const couriersQuery = useQuery({
    queryKey: ['couriers', statusFilter],
    queryFn: () =>
      getCouriers(statusFilter === 'all' ? {} : { status: statusFilter }),
  })

  const createCourierMutation = useMutation({
    mutationFn: createCourier,
    onSuccess: async () => {
      reset()
      await queryClient.invalidateQueries({ queryKey: ['couriers'] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ courierId, status }: UpdateCourierStatusVariables) =>
      updateCourierStatus(courierId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['couriers'] })
    },
  })

  const onCreateCourier = (data: CreateCourierRequest) => {
    createCourierMutation.mutate(data)
  }

  const onUpdateStatus = (courierId: string, status: CourierStatus) => {
    updateStatusMutation.mutate({ courierId, status })
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Исполнители доставки</p>
          <h1>Курьеры</h1>
        </div>
      </div>

      <div className="page-grid">
        <div className="card">
          <div className="section-header">
            <h2>Новый курьер</h2>
          </div>

          <form className="form" onSubmit={handleSubmit(onCreateCourier)}>
            <div className="form-row">
              <label className="form-label" htmlFor="courier-name">
                Имя
              </label>
              <input
                className="form-input"
                id="courier-name"
                {...register('name', { required: 'Укажите имя курьера' })}
              />
              {errors.name && (
                <span className="field-error">{errors.name.message}</span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="courier-phone">
                Телефон
              </label>
              <input
                className="form-input"
                id="courier-phone"
                {...register('phone', { required: 'Укажите телефон курьера' })}
              />
              {errors.phone && (
                <span className="field-error">{errors.phone.message}</span>
              )}
            </div>

            {createCourierMutation.isError && (
              <ErrorMessage message={getErrorMessage(createCourierMutation.error)} />
            )}

            <div className="form-actions">
              <Button disabled={createCourierMutation.isPending} type="submit">
                {createCourierMutation.isPending ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </form>
        </div>

        <div className="content-stack">
          <div className="toolbar">
            <label className="form-label" htmlFor="courier-status-filter">
              Статус
            </label>
            <select
              className="form-select filter-select"
              id="courier-status-filter"
              onChange={(event) =>
                setStatusFilter(event.target.value as CourierStatusFilter)
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

          {couriersQuery.isLoading && (
            <div className="panel">
              <Loading label="Загружаем курьеров..." />
            </div>
          )}

          {couriersQuery.isError && (
            <ErrorMessage message={getErrorMessage(couriersQuery.error)} />
          )}

          {updateStatusMutation.isError && (
            <ErrorMessage message={getErrorMessage(updateStatusMutation.error)} />
          )}

          {couriersQuery.isSuccess && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Телефон</th>
                    <th>Статус</th>
                    <th>Последнее обновление</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {couriersQuery.data.length === 0 ? (
                    <tr>
                      <td className="table-empty" colSpan={5}>
                        Курьеры не найдены.
                      </td>
                    </tr>
                  ) : (
                    couriersQuery.data.map((courier) => (
                      <tr key={courier.id}>
                        <td>{courier.name}</td>
                        <td>{courier.phone}</td>
                        <td>
                          <StatusBadge status={courier.status} />
                        </td>
                        <td>{formatDate(courier.updated_at)}</td>
                        <td>
                          <CourierStatusAction
                            key={`${courier.id}-${courier.status}`}
                            courierId={courier.id}
                            currentStatus={courier.status}
                            isPending={
                              updateStatusMutation.isPending &&
                              updateStatusMutation.variables?.courierId ===
                                courier.id
                            }
                            onSubmit={onUpdateStatus}
                          />
                        </td>
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

type CourierStatusActionProps = {
  courierId: string
  currentStatus: CourierStatus
  isPending: boolean
  onSubmit: (courierId: string, status: CourierStatus) => void
}

function CourierStatusAction({
  courierId,
  currentStatus,
  isPending,
  onSubmit,
}: CourierStatusActionProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<CourierStatus>(currentStatus)

  return (
    <form
      className="row-actions"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(courierId, selectedStatus)
      }}
    >
      <select
        className="form-select status-select"
        onChange={(event) =>
          setSelectedStatus(event.target.value as CourierStatus)
        }
        value={selectedStatus}
      >
        {courierStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        disabled={isPending || selectedStatus === currentStatus}
        type="submit"
        variant="secondary"
      >
        {isPending ? 'Смена...' : 'Сменить статус'}
      </Button>
    </form>
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла ошибка'
}

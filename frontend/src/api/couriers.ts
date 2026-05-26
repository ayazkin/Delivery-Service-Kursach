import { apiClient } from './client'
import type {
  AssignOrderToCourierRequest,
  Courier,
  CreateCourierRequest,
  GetCouriersParams,
  UpdateCourierStatusRequest,
} from '../types/courier'

type MessageResponse = {
  message: string
}

export function getCouriers(params: GetCouriersParams = {}) {
  return apiClient<Courier[] | null>(withQuery('/api/couriers', params)).then(
    normalizeList,
  )
}

export function getAvailableCouriers() {
  return apiClient<Courier[] | null>('/api/couriers/available').then(
    normalizeList,
  )
}

export function getCourierById(id: string) {
  return apiClient<Courier>(`/api/couriers/${id}`)
}

export function createCourier(data: CreateCourierRequest) {
  return apiClient<Courier>('/api/couriers', {
    method: 'POST',
    body: data,
  })
}

export function updateCourierStatus(id: string, data: UpdateCourierStatusRequest) {
  return apiClient<MessageResponse>(`/api/couriers/${id}/status`, {
    method: 'PUT',
    body: data,
  })
}

export function deleteCourier(id: string) {
  return apiClient<MessageResponse>(`/api/couriers/${id}`, {
    method: 'DELETE',
  })
}

export function assignOrderToCourier(
  courierId: string,
  data: AssignOrderToCourierRequest,
) {
  return apiClient<MessageResponse>(`/api/couriers/${courierId}/assign`, {
    method: 'POST',
    body: data,
  })
}

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()

  return queryString ? `${path}?${queryString}` : path
}

function normalizeList<T>(items: T[] | null) {
  return items ?? []
}

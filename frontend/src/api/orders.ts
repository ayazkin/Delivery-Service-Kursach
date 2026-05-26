import { apiClient } from './client'
import type {
  CreateOrderRequest,
  GetOrdersParams,
  Order,
  UpdateOrderStatusRequest,
} from '../types/order'

type MessageResponse = {
  message: string
}

export function getOrders(params: GetOrdersParams = {}) {
  return apiClient<Order[] | null>(withQuery('/api/orders', params)).then(
    normalizeList,
  )
}

export function getOrderById(id: string) {
  return apiClient<Order>(`/api/orders/${id}`)
}

export function createOrder(data: CreateOrderRequest) {
  return apiClient<Order>('/api/orders', {
    method: 'POST',
    body: data,
  })
}

export function updateOrderStatus(id: string, data: UpdateOrderStatusRequest) {
  return apiClient<MessageResponse>(`/api/orders/${id}/status`, {
    method: 'PUT',
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

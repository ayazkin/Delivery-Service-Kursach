export type OrderStatus =
  | 'created'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled'

export type Order = {
  id: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  items?: OrderItem[]
  total_amount: number
  status: OrderStatus
  courier_id?: string
  created_at: string
  updated_at: string
  delivered_at?: string
}

export type OrderItem = {
  id: string
  order_id: string
  name: string
  quantity: number
  price: number
}

export type CreateOrderRequest = {
  customer_name: string
  customer_phone: string
  delivery_address: string
  items: CreateOrderItemRequest[]
}

export type CreateOrderItemRequest = {
  name: string
  quantity: number
  price: number
}

export type UpdateOrderStatusRequest = {
  status: OrderStatus
  courier_id?: string
}

export type GetOrdersParams = {
  status?: OrderStatus
  courier_id?: string
  limit?: number
  offset?: number
}

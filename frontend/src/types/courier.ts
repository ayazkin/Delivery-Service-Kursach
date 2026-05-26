export type CourierStatus = 'offline' | 'available' | 'busy'

export type Courier = {
  id: string
  name: string
  phone: string
  status: CourierStatus
  current_lat?: number
  current_lon?: number
  created_at: string
  updated_at: string
  last_seen_at?: string
}

export type CreateCourierRequest = {
  name: string
  phone: string
}

export type UpdateCourierStatusRequest = {
  status: CourierStatus
  current_lat?: number
  current_lon?: number
}

export type GetCouriersParams = {
  status?: CourierStatus
  limit?: number
  offset?: number
}

export type AssignOrderToCourierRequest = {
  order_id: string
}

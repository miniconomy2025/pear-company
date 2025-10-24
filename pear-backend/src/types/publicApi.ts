// Public API Types - matching the OpenAPI specification exactly

export interface PublicOrderItem {
  model: string
  quantity: number
}

export interface PublicOrderRequest {
  accountNumber: string
  items: PublicOrderItem[]
}

export interface PublicOrderResponse {
  order_id: number
  price: number
  accountNumber: string
}

export interface PublicStockItem {
  phone_id: number
  name: string
  quantity: number
  price: number
}

export interface PublicStockResponse {
  items: PublicStockItem[]
}

export interface PaymentNotification {
  reference: number // order_id
  amount: number
}

export interface DeliveryConfirmation {
  delivery_reference: string
}

export interface SimulationResponse {
  message: string
  tick?: number
  status: string
}

export interface PublicOrderItems {
  phone_id: number
  quantity: number
}

// Internal types for business logic
export interface OrderReservation {
  order_id: number
  expires_at: Date
  total_price: number
  items: PublicOrderItems[]
}

export interface MachineFailureRequest {
  machineName: string,
  failureQuantity: number,
  simulationDate: string,
  simulationTime: string
}

export interface PickupRequest {
  type: "PICKUP";
  id: string;
  quantity: number;
}

export interface DeliveryRequest {
  type: "DELIVERY";
  id: number;
  items: {
    itemName: string;
    quantity: number;
    measurementType: string; // "UNIT" | "KG"
  }[];
}

export interface thohRequest {
  epochStartTime: string
}


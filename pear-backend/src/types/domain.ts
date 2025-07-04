// Core Manufacturing Domain Types
export interface Phone {
  phone_id: number
  model: string
  price: number
}

export interface Stock {
  stock_id: number
  phone_id: number
  quantity_available: number
  quantity_reserved: number
  updated_at: Date
}

export interface Machine {
  machine_id: number
  phone_id: number
  rate_per_day: number
}

export interface MachineRatio {
  machine_ratio_id: number
  machine_id: number
  part_id: number
  quantity: number
}

export interface Part {
  part_id: number
  name: string
}

export interface Inventory {
  inventory_id: number
  part_id: number
  quantity_available: number
}

export interface Supplier {
  supplier_id: number
  name: string
  account_id: number
  address: string
}

export interface PartSupplier {
  parts_supplier_id: number
  part_id: number
  supplier_id: number
  cost: number
}

export interface Order {
  order_id: number
  price: number
  amount_paid: number
  status: number
  created_at: Date
}

export interface OrderItem {
  order_item_id: number
  order_id: number
  phone_id: number
  quantity: number
}

export interface ConsumerDelivery {
  consumer_delivery_id: number
  order_id: number
  delivery_reference: number
  cost: number
  status: number
  account_id: number
}

export interface BulkDelivery {
  bulk_delivery_id: number
  parts_purchase_id: number
  delivery_reference: number
  cost: number
  status: number
  address: string
  account_id: number
}

export interface Status {
  status_id: number
  description: string
}

export interface Account {
  account_id: number
  account_name: string
  account_number: string
}

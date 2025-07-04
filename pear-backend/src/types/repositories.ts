import type { Phone, Stock, Machine, Part, Inventory, Order, OrderItem, Supplier, PartSupplier } from "./domain.js"

// Repository Interface Definitions
export interface IRepository<T, K = number> {
  findAll(): Promise<T[]>
  findById(id: K): Promise<T | null>
  create(data: Omit<T, keyof { [P in keyof T]: T[P] extends number ? P : never }[keyof T]>): Promise<T>
  update(id: K, data: Partial<T>): Promise<T | null>
  delete(id: K): Promise<boolean>
}

export interface IPhoneRepository extends IRepository<Phone> {}
export interface IStockRepository extends IRepository<Stock> {
  findByPhoneId(phoneId: number): Promise<Stock | null>
  reserveStock(phoneId: number, quantity: number): Promise<boolean>
  releaseStock(phoneId: number, quantity: number): Promise<boolean>
}
export interface IMachineRepository extends IRepository<Machine> {}
export interface IPartRepository extends IRepository<Part> {}
export interface IInventoryRepository extends IRepository<Inventory> {
  findByPartId(partId: number): Promise<Inventory | null>
}
export interface IOrderRepository extends IRepository<Order> {}
export interface IOrderItemRepository extends IRepository<OrderItem> {}
export interface ISupplierRepository extends IRepository<Supplier> {}
export interface IPartSupplierRepository extends IRepository<PartSupplier> {}

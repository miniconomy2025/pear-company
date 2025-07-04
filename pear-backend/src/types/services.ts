import type { Phone, Stock, Machine, Part, Inventory, Order, Supplier } from "./domain.js"

// Service Interface Definitions
export interface IPhoneService {
  getAllPhones(): Promise<Phone[]>
  getPhoneById(id: number): Promise<Phone | null>
  createPhone(phoneData: Omit<Phone, "phone_id">): Promise<Phone>
  updatePhone(id: number, phoneData: Partial<Phone>): Promise<Phone | null>
  deletePhone(id: number): Promise<boolean>
}

export interface IStockService {
  getAllStock(): Promise<Stock[]>
  getStockById(id: number): Promise<Stock | null>
  reserveStock(phoneId: number, quantity: number): Promise<boolean>
  releaseReservedStock(phoneId: number, quantity: number): Promise<boolean>
  confirmStockSale(phoneId: number, quantity: number): Promise<boolean>
  checkAvailability(phoneId: number, quantity: number): Promise<boolean>
}

export interface IMachineService {
  getAllMachines(): Promise<Machine[]>
  getMachineById(id: number): Promise<Machine | null>
  createMachine(machineData: Omit<Machine, "machine_id">): Promise<Machine>
  updateMachine(id: number, machineData: Partial<Machine>): Promise<Machine | null>
  deleteMachine(id: number): Promise<boolean>
}

export interface IPartService {
  getAllParts(): Promise<Part[]>
  getPartById(id: number): Promise<Part | null>
  createPart(partData: Omit<Part, "part_id">): Promise<Part>
  updatePart(id: number, partData: Partial<Part>): Promise<Part | null>
  deletePart(id: number): Promise<boolean>
}

export interface IInventoryService {
  getAllInventory(): Promise<Inventory[]>
  getInventoryById(id: number): Promise<Inventory | null>
  createInventory(inventoryData: Omit<Inventory, "inventory_id">): Promise<Inventory>
  updateInventory(id: number, inventoryData: Partial<Inventory>): Promise<Inventory | null>
  deleteInventory(id: number): Promise<boolean>
}

export interface IOrderService {
  getAllOrders(): Promise<Order[]>
  getOrderById(id: number): Promise<Order | null>
  createOrder(orderData: Omit<Order, "order_id">): Promise<Order>
  updateOrder(id: number, orderData: Partial<Order>): Promise<Order | null>
  deleteOrder(id: number): Promise<boolean>
}

export interface ISupplierService {
  getAllSuppliers(): Promise<Supplier[]>
  getSupplierById(id: number): Promise<Supplier | null>
  createSupplier(supplierData: Omit<Supplier, "supplier_id">): Promise<Supplier>
  updateSupplier(id: number, supplierData: Partial<Supplier>): Promise<Supplier | null>
  deleteSupplier(id: number): Promise<boolean>
}

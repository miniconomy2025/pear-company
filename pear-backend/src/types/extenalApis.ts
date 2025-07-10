
export interface ElectronicsPriceResponse {
  availableStock: number
  pricePerUnit: number
}

export interface ElectronicsCreateOrderResponse {
  orderId: number,
  quantity: number,
  amountDue: number,
  bankNumber: string,
}

export interface ElectronicsGetOrderResponse {
  orderId: number,
  status: string,
  orderedAt: number,
  quantity: number,
  remainingAmount: number,
}

export interface ScreensPriceResponse {
  screens: {
    availableStock: number,
    pricePerUnit: number,
  }
}

export interface ScreensCreateOrderResponse {
  orderId: number,
  totalPrice: number,
  bankAccountNumber: string,
  orderStatusLink: string,
}

export interface ScreensGetOrderResponse {
  orderId: number,
  quantity: number,
  unitPrice: number,
  totalPrice: number,
  status: string,
  orderDate: string,
  amountPaid: number,
  remainingBalance: number,
  isFullyPaid: boolean
}

export interface CasesPriceResponse {
  available_units: number
  price_per_unit: number
}

export interface CasesCreateOrderResponse {
  id: number,
  order_status_id: number,
  quantity: number,
  total_price: number,
  ordered_at: string,
  account_number: string
}

export interface CasesGetOrderResponse {
  id: number,
  order_status_id: string,
  ordered_at: string,
  quantity: number,
  status: string,
}

export interface CustomersPickUpRequest {
  quantity: number,
  pickup_from: string,
  delivery_to: string,
}

export interface CustomersPickUpResponse {
  refernceno: number,
  amount: number,
  accountNumber: string
}

export interface CustomersAllPickUpResponse {
  id: number,
  quantity: number,
  company_name: string,
  status: string,
}

export interface CustomersCompanyResponse {
  id: number,
  company_name: string,
}

export interface BulkItemRequest {
  itemName: string,
  quantity: number
}

export interface BulkCreatePickUpRequest {
  originalExternalOrderId: string,
  originCompanyId: string,
  destinationCompanyId: string,
  items: BulkItemRequest[]
}

export interface BulkCreatePickUpResponse {
  pickupRequestId: number,
  cost: number,
  paymentReferenceId: string,
  bulkLogisticsBankAccountNumber: string,
  status: string,
  statusCheckUrl: string
}

export interface BulkPickUpResponse {
  pickupRequestId: number,
  cost: number,
  status: string,
  originCompanyName: string,
  originalExternalOrderId: string,
  requestDate: string,
  items: BulkItemRequest[]
}

export interface SimulationTimeResponse {
  date: string,
  time: string,
}

export interface SimulationBuyMachineResponse {
  orderId: number,
  machineName: string,
  totalPrice: number,
  unitWeight: number,
  totalWeight: number,
  quantity: number,
  machineDetails: {
    requiredMaterials: string,
    inputRatio: {[key: string]: number},
    productionRate: number
  },
  bankAccount: string
}

export interface SimulationOrderPaymentRequest {
  orderId: number
}

export interface SimulationOrderPaymentResponse {
  orderId: number
  itemName: string
  quantity: number
  totalPrice: number
  status: string
  message: string
  canFulfill: boolean
}
export interface MachineItem {
  machineName: string,
  quantity: number,
  materialRatio: string,
  productionRate: number
}

export interface SimulationMachineResponse {
  machines: [MachineItem]
}

export interface LoanItems {
  loan_number: string,
  due: number
}

export interface CommercialBankLoansResponse {
  total_due: number,
  loans: [LoanItems]
}

export interface CommercialBankTransationRequest {
  to_account_number: string,
  to_bank_name: string,
  amount: number,
  description: string
}

export interface CommercialBankTransationResponse {
  success: boolean,
  transaction_number: string,
  status: string
}

export interface CommercialBankTransationItemResponse {
  transaction_number: string,
  from: string,
  to: string,
  amount: number,
  description: string,
  status: string,
  timestamp: number
}

export interface CommercialBankTakeLoanResponse {
  success: boolean,
  loan_number: string
}

export interface CommercialBankLoanListResponse {
  loan_number: string,
  initial_amount: number,
  interest_rate: number,
  started_at: number,
  write_off: boolean,
  outstanding_amount: number
}

export interface CommercialBankLoanPayResponse {
  success: boolean,
  paid: 0
}

export interface LoanPayments {
  timestamp: number,
  amount: number,
  is_interest: boolean
}

export interface CommercialBankLoanDetailsResponse {
  loan_number: string,
  initial_amount: number,
  outstanding: number,
  interest_rate: number,
  started_at: number,
  write_off: boolean,
  payments: [LoanPayments]
}

export interface CommercialBankAccountResponse {
  account_number: string
}


import {
  BulkCreatePickUpRequest,
  BulkCreatePickUpResponse,
  BulkPickUpResponse,
  BulkItemRequest
} from "../types/extenalApis.js";

/**
 * Mock for creating a bulk pickup request.
 */
export async function createPickupRequest(
  request: BulkCreatePickUpRequest
): Promise<BulkCreatePickUpResponse | undefined> {
  return {
    pickupRequestId: 12345,
    cost: 5000,
    paymentReferenceId: "MOCK_PAYMENT_REF_001",
    bulkLogisticsBankAccountNumber: "9876543210",
    status: "PENDING",
    statusCheckUrl: "https://mocked.example.com/status/12345"
  };
}

/**
 * Mock for fetching a specific bulk pickup request.
 */
export async function getPickupRequest(
  pickupRequestId: number
): Promise<BulkPickUpResponse | undefined> {
  return {
    pickupRequestId,
    cost: 5000,
    status: "DELIVERED",
    originCompanyName: "MOCK_ORIGIN_COMPANY",
    originalExternalOrderId: "EXTORDER123",
    requestDate: new Date().toISOString(),
    items: [
      { itemName: "Screen", quantity: 100 },
      { itemName: "Case", quantity: 50 }
    ]
  };
}

/**
 * Mock for fetching all bulk pickup requests by company.
 */
export async function getPickupRequestsByCompany(
  companyId: string
): Promise<Array<BulkPickUpResponse> | undefined> {
  return [
    {
      pickupRequestId: 1,
      cost: 2500,
      status: "PENDING",
      originCompanyName: companyId,
      originalExternalOrderId: "ORDER_001",
      requestDate: new Date().toISOString(),
      items: [{ itemName: "Battery", quantity: 200 }]
    },
    {
      pickupRequestId: 2,
      cost: 3750,
      status: "DELIVERED",
      originCompanyName: companyId,
      originalExternalOrderId: "ORDER_002",
      requestDate: new Date().toISOString(),
      items: [
        { itemName: "Screen", quantity: 300 },
        { itemName: "Camera", quantity: 100 }
      ]
    }
  ];
}

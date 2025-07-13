import {
  CustomersPickUpRequest,
  CustomersPickUpResponse,
  CustomersAllPickUpResponse,
  CustomersCompanyResponse
} from "../types/extenalApis.js";

/**
 * Mock: Create a new pickup request for a consumer.
 */
export async function createPickup(
  pickUp: CustomersPickUpRequest
): Promise<CustomersPickUpResponse | undefined> {
  return {
    refernceno: 90001,
    amount: pickUp.quantity * 100, // Mock formula for amount
    accountNumber: "ACC999001"
  };
}

/**
 * Mock: List all pickups filtered by status.
 */
export async function listPickups(
  status: string
): Promise<Array<CustomersAllPickUpResponse> | undefined> {
  return [
    {
      id: 1,
      quantity: 200,
      company_name: "Pear Logistics",
      status: status || "DELIVERED"
    },
    {
      id: 2,
      quantity: 75,
      company_name: "SumSang Logistics",
      status: status || "PENDING"
    }
  ];
}

/**
 * Mock: Create a new company.
 */
export async function createCompany(
  company_name: string
): Promise<CustomersCompanyResponse | undefined> {
  return {
    id: 501,
    company_name
  };
}

/**
 * Mock: List all companies.
 */
export async function listCompanies(): Promise<Array<CustomersCompanyResponse> | undefined> {
  return [
    {
      id: 1,
      company_name: "Pear Logistics"
    },
    {
      id: 2,
      company_name: "SumSang Logistics"
    },
    {
      id: 3,
      company_name: "Mango Movers"
    }
  ];
}

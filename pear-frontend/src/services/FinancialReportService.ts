import { API_BASE_URL } from '../config/apiConfig';

export interface Expenses {
  manufacturing: number;
  logistics: number;
  loans: number;
  supply: number;
}

export interface LoanStatus {
  borrowed: number;
  repaid: number;
  remaining: number;
}

export interface ProfitMarginsData { 
  label: string,
  cost: number,
  price: number       
}

export interface FinancialData {
  revenue: number;
  expenses: Expenses;
  profitMargins: ProfitMarginsData[];
}

export const getFinancialReport = async (): Promise<FinancialData> => {
  try {
    const res = await fetch(`${API_BASE_URL}/internal-api/reports/financial`);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Financial report fetch error:', err);
    throw err;
  }
};

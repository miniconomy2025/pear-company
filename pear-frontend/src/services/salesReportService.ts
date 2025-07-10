import { API_BASE_URL } from '../config/apiConfig';

export interface SalesReportItem {
  model: string;
  date: string;
  units_sold: number;
  revenue: number;
}

export const getSalesReport = async (from: string, to: string): Promise<SalesReportItem[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/internal-api/reports/sales?from=${from}&to=${to}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Sales report fetch error:', err);
    throw err;
  }
};

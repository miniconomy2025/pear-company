import { API_BASE_URL } from '../config/apiConfig';

export interface ProductionItem {
  model: string;
  total: number;
}

export const getProductionReport = async (): Promise<ProductionItem[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/internal-api/reports/production`);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Production report fetch error:', err);
    throw err;
  }
};

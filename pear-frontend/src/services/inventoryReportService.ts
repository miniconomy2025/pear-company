import { API_BASE_URL } from '../config/apiConfig';

export interface InventoryItem {
  part: string;
  quantity: number;
}

export const getInventoryReport = async (): Promise<InventoryItem[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/reports/inventory`);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Inventory report fetch error:', err);
    throw err;
  }
};


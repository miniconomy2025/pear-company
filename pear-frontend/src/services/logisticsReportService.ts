import { API_BASE_URL } from '../config/apiConfig';

export interface BulkParts {
  part: string;
  quantity: number;
  cost: number;
}
export interface ConsumerLogisticsData {
  model: string;
  delivered: number;
  cost: number;
}

export interface ConsumerPendingDeliveriesData {
  model: string;
  units_pending: number;
  cost: number;
}

export const getBulkDeliveries = async (): Promise<BulkParts[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/reports/logistics/bulk`);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Bulk Deliveries report fetch error:", err);
    throw err;
  }
};

export const getConsumerDeliveries = async (): Promise<
  ConsumerLogisticsData[]
> => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/reports/logistics/consumer`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Consumer Deliveries report fetch error:", err);
    throw err;
  }
};

export const getConsumerPendingDeliveries = async (): Promise<
  ConsumerPendingDeliveriesData[]
> => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/reports/logistics/consumer/pending`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Consumer Pending Deliveries report fetch error:", err);
    throw err;
  }
};

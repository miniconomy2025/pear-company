import { BulkDeliveriesResponse, ConsumerDeliveriesResponse, PurchaseCasesResponse, PurchaseElectronicsResponse, PurchaseScreensResponse } from "../types/ExternalApiTypes.js";

export class SuppliersAPIs {
    static async purchaseCases(quantity: number): Promise<PurchaseCasesResponse> {
        try {
            const response = await fetch('https://case-suppliers/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity
                }),
            });

            if (!response.ok) {
                return { success: false, message: `HTTP ${response.status}` };
            }

            const result: PurchaseCasesResponse = await response.json();
            return result;
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }

    static async purchaseScreens(quantity: number): Promise<PurchaseScreensResponse> {
        try {
            const response = await fetch('https://screen-suppliers/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity
                }),
            });

            if (!response.ok) {
                return { success: false, message: `HTTP ${response.status}` };
            }

            const result: PurchaseScreensResponse = await response.json();
            return result;
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }

    static async purchaseElectronics(quantity: number): Promise<PurchaseElectronicsResponse> {
        try {
            const response = await fetch('https://electronics-suppliers/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity
                }),
            });

            if (!response.ok) {
                return { success: false, message: `HTTP ${response.status}` };
            }

            const result: PurchaseElectronicsResponse = await response.json();
            return result;
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }
}

export class ElectronicsSuppliers {
    static async purchaseElectronics(quantity: number): Promise<PurchaseElectronicsResponse> {
        try {
            const response = await fetch('https://electronics-suppliers/api/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity
                }),
            });

            if (!response.ok) {
                return { success: false, message: `HTTP ${response.status}` };
            }

            const result: PurchaseElectronicsResponse = await response.json();
            return result;
        } catch (error) {
            return { success: false, message: (error as Error).message };
        }
    }
}


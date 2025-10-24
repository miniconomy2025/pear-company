export const createPickupRequest = jest.fn().mockResolvedValue({
  pickupRequestId: "pickup-1",
  paymentReferenceId: "ref-1",
  bulkLogisticsBankAccountNumber: "7777-8888",
  cost: 450,
});

export const createElectronicsOrder = jest.fn().mockResolvedValue({
  orderId: 3001,
  bankNumber: "5555-6666",
  amountDue: 5000,
});

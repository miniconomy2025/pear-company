type MockConfig = {
  SIMULATION_API: boolean;
  COMMERCIAL_BANK: boolean;
  BULK_LOGISTICS: boolean;
  CUSTOMER_LOGISTICS: boolean;
  SUPPLIERS: boolean;
};

const parseBool = (value?: string): boolean | undefined => {
  if (value == null) return undefined;
  const v = value.trim().toLowerCase();
  if (["1", "true", "t", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "f", "no", "n", "off"].includes(v)) return false;
  return undefined; 
};

export const USE_MOCKS_DEFAULT =
  parseBool(process.env.USE_MOCKS) ?? (process.env.NODE_ENV === "test");

const cfg: MockConfig = {
  SIMULATION_API: parseBool(process.env.MOCK_SIMULATION_API) ?? USE_MOCKS_DEFAULT,
  COMMERCIAL_BANK: parseBool(process.env.MOCK_COMMERCIAL_BANK) ?? USE_MOCKS_DEFAULT,
  BULK_LOGISTICS: parseBool(process.env.MOCK_BULK_LOGISTICS) ?? USE_MOCKS_DEFAULT,
  CUSTOMER_LOGISTICS: parseBool(process.env.MOCK_CUSTOMER_LOGISTICS) ?? USE_MOCKS_DEFAULT,
  SUPPLIERS: parseBool(process.env.MOCK_SUPPLIERS) ?? USE_MOCKS_DEFAULT,
};

export const MOCK_CONFIG: Readonly<MockConfig> = Object.freeze(cfg);
export type MockService = keyof MockConfig;

export const isMockEnabled = (service: MockService): boolean => MOCK_CONFIG[service];

if (process.env.DEBUG_MOCKS === "true" || process.env.NODE_ENV === "test") {
  console.log("Mock Services Configuration:", {
    default: USE_MOCKS_DEFAULT,
    details: MOCK_CONFIG,
  });
}

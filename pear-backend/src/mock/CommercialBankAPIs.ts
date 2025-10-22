import {
  CommercialBankAccountResponse,
  CommercialBankLoansResponse,
  CommercialBankTransationRequest,
  CommercialBankTransationResponse,
  CommercialBankTransationItemResponse,
  CommercialBankTakeLoanResponse,
  CommercialBankLoanListItemResponse,
  CommercialBankLoanPayResponse,
  CommercialBankLoanDetailsResponse,
  LoanItems,
  LoanPayments
} from "../types/extenalApis.js";

/**
 * Mock: Create a new commercial bank account.
 */
export async function createAccount(): Promise<CommercialBankAccountResponse | undefined> {
  return {
    account_number: "MOCKBANK123456"
  };
}

/**
 * Mock: Get the current user's account number.
 */
export async function getMyAccount(): Promise<string | undefined> {
  return "MOCKBANK123456";
}

/**
 * Mock: Set a notification URL for the bank account.
 */
export async function setNotificationUrl(
  notification_url: string
): Promise<boolean | undefined> {
  return true;
}

/**
 * Mock: Get the account balance.
 */
export async function getBalance(): Promise<number | undefined> {
  return 55500.75;
}

/**
 * Mock: Check if the account is frozen.
 */
export async function isAccountFrozen(): Promise<boolean | undefined> {
  return false;
}

/**
 * Mock: Get all outstanding loans.
 */
export async function getMyLoans(): Promise<CommercialBankLoansResponse | undefined> {
  return {
    success: true,
    total_outstanding_amount: 4000.00,
    loans: [
      {
        loan_number: "LN001",
        initial_amount: 3000.00,
        interest_rate: 0.2,
        write_off: false,
        outstanding_amount: 2500.00
      },
      {
        loan_number: "LN002",
        initial_amount: 3000.00,
        interest_rate: 0.1,
        write_off: false,
        outstanding_amount: 1500.00
      }
    ]
  };
}

/**
 * Mock: Create a new transaction.
 */
export async function createTransaction(
  payload: CommercialBankTransationRequest
): Promise<CommercialBankTransationResponse | undefined> {
  return {
    success: true,
    transaction_number: "TXN987654",
    status: "COMPLETED"
  };
}

/**
 * Mock: Get a statement (transaction list) for a period.
 */
export async function getStatement(
  from: number,
  to: number,
  only_successful: boolean
): Promise<Array<CommercialBankTransationItemResponse> | undefined> {
  return [
    {
      transaction_number: "TXN10001",
      from: "MOCKBANK123456",
      to: "MOCKBANK654321",
      amount: 250.00,
      description: "Payment for services",
      status: "SUCCESS",
      timestamp: from + 1000
    },
    {
      transaction_number: "TXN10002",
      from: "MOCKBANK123456",
      to: "MOCKBANK111111",
      amount: 110.75,
      description: "Refund",
      status: only_successful ? "SUCCESS" : "FAILED",
      timestamp: from + 2000
    }
  ];
}

/**
 * Mock: Get a specific transaction by its number.
 */
export async function getTransaction(
  transaction_number: number
): Promise<CommercialBankTransationItemResponse | undefined> {
  return {
    transaction_number: String(transaction_number),
    from: "MOCKBANK123456",
    to: "MOCKBANK654321",
    amount: 299.99,
    description: "Transfer",
    status: "SUCCESS",
    timestamp: Date.now()
  };
}

/**
 * Mock: Take out a loan.
 */
export async function takeLoan(
  amount: number
): Promise<CommercialBankTakeLoanResponse | undefined> {
  return {
    success: true,
    loan_number: "LNMOCK100"
  };
}

/**
 * Mock: List all loans.
 */
export async function listLoans(): Promise<CommercialBankLoanListItemResponse[] | undefined> {
  return [
    {
      loan_number: "LN001",
      initial_amount: 3000,
      interest_rate: 0.12,
      write_off: false,
      outstanding_amount: 1200
    },
    {
      loan_number: "LN002",
      initial_amount: 5000,
      interest_rate: 0.09,
      write_off: false,
      outstanding_amount: 4100
    }
  ];
}

/**
 * Mock: Repay a loan.
 */
export async function repayLoan(
  loan_number: number,
  amount: number
): Promise<CommercialBankLoanPayResponse | undefined> {
  return {
    success: true,
    paid: 0
  };
}

/**
 * Mock: Get details for a specific loan.
 */
export async function getLoan(
  loan_number: number
): Promise<CommercialBankLoanDetailsResponse | undefined> {
  return {
    success: true,
    loan: {
      loan_number: String(loan_number),
      initial_amount: 2000,
      outstanding_amount: 700,
      interest_rate: 0.1,
      write_off: false,
      payments: [
        {
          timestamp: Date.now() - 50000,
          amount: 500,
          is_interest: false
        },
        {
          timestamp: Date.now() - 25000,
          amount: 100,
          is_interest: true
        }
      ]
    }
  };
}

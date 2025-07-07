import React from 'react';
import './FinancialReport.css'

const FinancialReport: React.FC = () => {
  // Ð as currency
  return (
    <div className="screen route-spacing">
      <h2 className="title">Financial Performance Report</h2>
      <ul className="list">
        <li>Total Revenue (from sales over time)</li>
        <li>Total Expenses (Manufacturing, Logistics, Loans, Equipment, Parts)</li>
        <li>Net Profit / Loss over time</li>
        <li>Loan Status: Borrowed, Repaid, Remaining</li>
        <li>Cost Per Unit vs. Selling Price </li>
      </ul>
    </div>
  );
};

export default FinancialReport;

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { getFinancialReport, FinancialData } from '../../services/FinancialReportService';
import './FinancialReport.css';

const FinancialReport: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);

  const getData = async () => {
    const data = await getFinancialReport();

    setFinancialData(data);
  };

  useEffect(() => {
    getData();
  }, []);

  if (!financialData) return <div>Loading...</div>;

  const expenseValues = Object.values(financialData.expenses);
  const totalExpenses = expenseValues.reduce((a, b) => a + b, 0);
  const netProfit = financialData.revenue - totalExpenses;

  const expenseData = Object.entries(financialData.expenses).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#a9a9a9'];

  return (
    <div className="screen">
      <h2 className="title">Financial Performance Report</h2>

      <div className="totals-display">
        <p><strong>Total Revenue:</strong> Ð{financialData.revenue.toLocaleString()}</p>
        <p><strong>Total Expenses:</strong> Ð{totalExpenses.toLocaleString()}</p>
        <p><strong>Net Profit:</strong> Ð{netProfit.toLocaleString()}</p>
      </div>

      <div className="chart-section">
        <h3>Expenses Breakdown</h3>
        <PieChart width={600} height={300}>
          <Pie
            data={expenseData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {expenseData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`Ð${value.toLocaleString()}`, name]} />
        </PieChart>

      </div>

      <div className="chart-section">
        <h3>Profit Margin Analysis</h3>

        <BarChart width={600} height={300} data={financialData.profitMargins}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="cost" fill="#ff7f50" name="Cost per Unit" />
          <Bar dataKey="price" fill="#82ca9d" name="Selling Price" />
        </BarChart>
      </div>
    </div >
  );
};

export default FinancialReport;

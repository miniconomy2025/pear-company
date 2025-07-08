"use client"

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { getSalesReport, SalesReportItem } from '../../services/salesReportService';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import DateFilter from '../../components/filters/DateFilter';
import './SalesReport.css';

const SalesReport: React.FC = () => {
  const [data, setData] = useState<SalesReportItem[]>([]);
  const [fromDate, setFromDate] = useState<string>('2025-07-01');
  const [toDate, setToDate] = useState<string>('2025-07-30');

  const getFilteredData = useCallback(async () => {
    const sales = await getSalesReport(fromDate, toDate)
    const filtered = sales.filter((item) => {
      const d = new Date(item.date);
      return d >= new Date(fromDate) && d <= new Date(toDate);
    });
    setData(filtered);
  }, [fromDate, toDate])

  useEffect(() => {
    getFilteredData();
  }, [getFilteredData]);

  const totals = data.reduce<Record<string, { units: number; revenue: number }>>((acc, curr) => {
    const key = curr.model.toLowerCase();
    if (!acc[key]) acc[key] = { units: 0, revenue: 0 };
    acc[key].units += curr.units_sold;
    acc[key].revenue += curr.revenue;
    return acc;
  }, {});

  return (
    <div className="screen route-spacing">
      <h2 className="title">Sales Reporting</h2>

      <DateFilter
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onFilter={getFilteredData}
      />

      <div className="totals-display">
        <h4>Summary</h4>
        <ul>
          <li><strong>ePhone</strong> — Units Sold: {totals['ephone']?.units || 0}, Revenue: Ð {totals['ephone']?.revenue || 0}</li>
          <li><strong>ePhone plus</strong> — Units Sold: {totals['ephone plus']?.units || 0}, Revenue: Ð {totals['ephone plus']?.revenue || 0}</li>
          <li><strong>ePhone pro max</strong> — Units Sold: {totals['ephone pro max']?.units || 0}, Revenue: Ð {totals['ephone pro max']?.revenue || 0}</li>
        </ul>
      </div>

      <div className="chart-card">
        <h3>Units Sold per Model</h3>
        <ResponsiveContainer width={600} height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar type="monotone" dataKey="units_sold" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Revenue per Model in Ð(Dogecoin)</h3>
        <ResponsiveContainer width={600} height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="revenue" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesReport;

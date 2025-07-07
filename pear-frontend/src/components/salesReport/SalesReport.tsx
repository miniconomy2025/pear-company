"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { mockApiService } from "../../services/mockApiService"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import DateFilter from "../../components/filters/DateFilter"
import "./SalesReport.css"

interface SalesData {
  model: string
  unitsSold: number
  revenue: number
  date: string
}

const SalesReport: React.FC = () => {
  const [data, setData] = useState<SalesData[]>([])
  const [fromDate, setFromDate] = useState<string>("2025-07-01")
  const [toDate, setToDate] = useState<string>("2025-07-30")

  // Fix: Wrap fetchFilteredData in useCallback with proper dependencies
  const fetchFilteredData = useCallback(async () => {
    const sales = await mockApiService.fetchSalesData("monthly")
    const filtered = sales.filter((item) => {
      const d = new Date(item.date)
      return d >= new Date(fromDate) && d <= new Date(toDate)
    })
    setData(filtered)
  }, [fromDate, toDate]) 

  useEffect(() => {
    fetchFilteredData()
  }, [fetchFilteredData]) 

  const totals = data.reduce<Record<string, { units: number; revenue: number }>>((acc, curr) => {
    if (!acc[curr.model]) acc[curr.model] = { units: 0, revenue: 0 }
    acc[curr.model].units += curr.unitsSold
    acc[curr.model].revenue += curr.revenue
    return acc
  }, {})

  return (
    <div className="screen route-spacing">
      <h2 className="title">Sales Reporting</h2>
      <DateFilter
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onFilter={fetchFilteredData}
      />
      <div className="totals-display">
        <h4>Summary</h4>
        <ul>
          <li>
            <strong>ePhone</strong> — Units Sold: {totals["ePhone"]?.units || 0}, Revenue: Ð{" "}
            {totals["ePhone"]?.revenue || 0}
          </li>
          <li>
            <strong>ePhone plus</strong> — Units Sold: {totals["ePhone plus"]?.units || 0}, Revenue: Ð{" "}
            {totals["ePhone plus"]?.revenue || 0}
          </li>
          <li>
            <strong>ePhone pro max</strong> — Units Sold: {totals["ePhone pro max"]?.units || 0}, Revenue: Ð{" "}
            {totals["ePhone pro max"]?.revenue || 0}
          </li>
        </ul>
      </div>
      <div className="chart-card">
        <h3>Units Sold per Model</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="unitsSold" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <h3>Revenue per Model in Ð(Dogecoin)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default SalesReport

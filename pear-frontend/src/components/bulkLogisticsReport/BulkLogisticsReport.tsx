import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getBulkDeliveries, BulkParts } from '../../services/logisticsReportService'
import './BulkLogisticsReport.css';

const BulkLogisticsReport: React.FC = () => {
  const [bulkData, setBulkData] = useState<BulkParts[]>([]);

  const getBulkLogistics = async () => {
    const data = await getBulkDeliveries();
    setBulkData(data);
  };

  useEffect(() => {
    getBulkLogistics();
  }, []);

  return (
    <div className="screen">
      <h2 className="title">Bulk Logistics Report</h2>

      <div className="totals-display">
        <h3>Stock Received</h3>
        <ul>
          {bulkData.map((item: any) => (
            <li key={item.part}>{item.part}: {item.quantity} units — Cost: Ð{item.cost}</li>
          ))}
        </ul>
      </div>

      <div className="chart-section">
        <h3>Bulk Stock vs Cost</h3>
        <BarChart width={600} height={300} data={bulkData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="part" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="quantity" fill="#82ca9d" name="Quantity" />
          <Bar dataKey="cost" fill="#8884d8" name="Cost" />
        </BarChart>
      </div>
    </div>
  );
};

export default BulkLogisticsReport;

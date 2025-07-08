import React, { useEffect, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import './SupplierInventoryReport.css';
import { getInventoryReport, InventoryItem } from '../../services/inventoryReportService';

const SupplierInventoryReport: React.FC = () => {
  const [inventoryLevels, setInventoryLevels] = useState<InventoryItem[]>([]);

  const getInventory = async () => {
    const data = await getInventoryReport();
    setInventoryLevels(data);
  };

  useEffect(() => {
    getInventory();
  }, []);

  return (
    <div className="screen">
      <h2 className="title">Supplier & Inventory Report</h2>

      <div className="totals-display">
        <h3>Inventory Levels</h3>
        <ul>
          {inventoryLevels.map((item: any) => (
            <li key={item.part}>{item.part}: {item.quantity} units</li>
          ))}
        </ul>
      </div>

      <div className="chart-section">
        <h3>Part Inventory</h3>
        <BarChart width={600} height={300} data={inventoryLevels}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="part" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="quantity" fill="#8884d8" name="Quantity" />
        </BarChart>
      </div>

    </div>
  );
};

export default SupplierInventoryReport;

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import { getProductionReport, ProductionItem } from '../../services/ProductionReportService'
import './ProductionReport.css';

const ProductionReport: React.FC = () => {
  const [productionData, setProductionData] = useState<ProductionItem[]>([]);

  const getProduction = async () => {
    const data = await getProductionReport();
    setProductionData(data);
  };

  useEffect(() => {
    getProduction();
  }, []);

  return (
    <div className="screen">
      <h2 className="title">Production Overview Report</h2>

      <div className="totals-display">
        <h4>Items Produced:</h4>
        <ul>
          {productionData.map((item) => (
            <li key={item.model}>
              {item.model}: {item.total.toLocaleString()} units
            </li>
          ))}
        </ul>
      </div>


      <div className="chart-section">
        <h3>Total Phones Produced</h3>
        <BarChart width={600} height={300} data={productionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" fill="#8884d8" name="Units Produced" />
        </BarChart>
      </div>

      <div className="chart-section">
        <h3>Production Capacity Over Time</h3>
        <LineChart width={600} height={300} data={productionData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#82ca9d" name="Capacity" />
        </LineChart>
      </div>

    </div>
  );
};

export default ProductionReport;

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './ConsumerLogisticsReport.css';
import { getConsumerDeliveries, ConsumerLogisticsData } from '../../services/logisticsReportService' 

const ConsumerLogisticsReport: React.FC = () => {
  const [consumerData, setConsumerData] = useState<ConsumerLogisticsData[]>([]);

  const getConsumerLogistics = async () => {
    const data = await getConsumerDeliveries();
    setConsumerData(data);
  };

  useEffect(() => {
    getConsumerLogistics();
  }, []);

  return (
    <div className="screen">
      <h2 className="title">Consumer Logistics Report</h2>

      <div className="totals-display">
        <h3>Phones Delivered</h3>
        <ul>
          {consumerData.map((item: any) => (
            <li key={item.model}>{item.model}: {item.delivered} units — Cost: Ð{item.cost}</li>
          ))}
        </ul>
      </div>

      <div className="chart-section">
        <h3>Consumer Deliveries vs Cost</h3>
        <BarChart width={600} height={300} data={consumerData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="delivered" fill="#82ca9d" name="Delivered" />
          <Bar dataKey="cost" fill="#8884d8" name="Cost" />
        </BarChart>
      </div>
    </div>
  );
};

export default ConsumerLogisticsReport;

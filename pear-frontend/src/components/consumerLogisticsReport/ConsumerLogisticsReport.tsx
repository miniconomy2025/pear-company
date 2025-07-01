import React from 'react';
import './ConsumerLogisticsReport.css';

const ConsumerLogisticsReport: React.FC = () => {
  return (
    <div className="screen route-spacing">
      <h2 className="title">Consumer Logistics Report</h2>
      <ul className="list">
        <li>Phones Delivered to Consumers</li>
        <li>Delivery Costs</li>
      </ul>
    </div>
  );
};

export default ConsumerLogisticsReport;
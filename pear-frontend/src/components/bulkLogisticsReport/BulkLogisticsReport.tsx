import React from 'react';
import './BulkLogisticsReport.css';

const BulkLogisticsReport: React.FC = () => {
  return (
    <div className="screen route-spacing">
      <h2 className="title">Bulk Logistics Report</h2>
      <ul className="list">
        <li>Stock Received (Electronics, Screens, Cases)</li>
        <li>Cost of Bulk Deliveries</li>
      </ul>
    </div>
  );
};

export default BulkLogisticsReport;
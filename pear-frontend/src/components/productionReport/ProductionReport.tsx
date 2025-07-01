import React from 'react';
import './ProductionReport.css'

const ProductionReport: React.FC = () => {
  return (
    <div className="screen route-spacing">
      <h2 className="title">Production Overview Report</h2>
      <ul className="list">
        <li>Total Phones Produced for each model </li>
        <li>Production Capacity per model </li>
        <li>Manufacturing Costs Breakdown </li>
        <li>Equipment Usage: % Utilisation</li>
      </ul>
    </div>
  );
};

export default ProductionReport;
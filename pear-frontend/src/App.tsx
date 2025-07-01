import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/header/Header';
import Dashboard from './components/dashboard/Dashboard';
import SalesReport from './components/salesReport/SalesReport';
import SupplierInventoryReport from './components/supplierInventoryReport/SupplierInventoryReport';
import BulkLogisticsReport from './components/bulkLogisticsReport/BulkLogisticsReport';
import ConsumerLogisticsReport from './components/consumerLogisticsReport/ConsumerLogisticsReport';
import ProductionReport from './components/productionReport/ProductionReport';
import FinancialReport from './components/financialReport/FinancialReport';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports/sales" element={<SalesReport />} />
          <Route path="/reports/suppliers" element={<SupplierInventoryReport />} />
          <Route path="/reports/logistics/bulk" element={<BulkLogisticsReport />} />
          <Route path="/reports/logistics/consumer" element={<ConsumerLogisticsReport />} />
          <Route path="/reports/production" element={<ProductionReport />} />
          <Route path="/reports/financial" element={<FinancialReport />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
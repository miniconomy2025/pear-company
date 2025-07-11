import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSalesReport } from '../../services/salesReportService';
import { getProductionReport } from '../../services/ProductionReportService'
import { getConsumerPendingDeliveries } from '../../services/logisticsReportService'
import './Dashboard.css'

interface DashboardStats {
  totalRevenue: number;
  totalStockCount: number;
  deliveriesPending: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalStockCount: 0,
    deliveriesPending: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const salesData = await getSalesReport('2025-07-01','2025-12-30');
      const totalPhones = await getProductionReport();
      const logistics = await getConsumerPendingDeliveries();

      const totalRevenue = salesData.reduce((sum, model) => sum + model.revenue, 0);
      const totalStockCount = totalPhones.reduce((sum, model) => sum + model.total, 0);
      const deliveriesPending = logistics.reduce((sum, item) => sum + item.units_pending, 0);

      setStats({
        totalRevenue,
        totalStockCount,
        deliveriesPending,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="screen">
      <h1 className="title">ePhone Shop Reporting Dashboard</h1>
      <div className="card-grid">
        <Link to="/reports/sales" className="card card-blue">Sales Report</Link>
        <Link to="/reports/inventory" className="card card-green">Supplier & Inventory Report</Link>
        <Link to="/reports/logistics/bulk" className="card card-purple">Bulk Logistics Report</Link>
        <Link to="/reports/logistics/consumer" className="card card-yellow">Consumer Logistics Report</Link>
        <Link to="/reports/production" className="card card-orange">Production Report</Link>
        <Link to="/reports/financial" className="card card-red">Financial Report</Link>
      </div>
      <div className="card card-gray">
        <p className="small-heading">Quick Stats:</p>
        <ul className="list">
          <li>Total Revenue: Ð {stats.totalRevenue.toLocaleString()}</li>
          <li>Total Items in Stock: {stats.totalStockCount}</li>
          <li>Deliveries Pending: {stats.deliveriesPending}</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;

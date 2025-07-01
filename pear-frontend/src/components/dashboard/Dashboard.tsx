import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockApiService } from '../../services/mockApiService';
import './Dashboard.css'

interface DashboardStats {
  totalRevenue: number;
  totalCustomers: number;
  stockCount: number;
  deliveriesPending: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCustomers: 0,
    stockCount: 0,
    deliveriesPending: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const salesData = await mockApiService.fetchSalesData('monthly');
      const stock = await mockApiService.fetchInventoryLevels();
      const logistics = await mockApiService.fetchLogisticsData();
      const totalCustomersData = await mockApiService.fetchCustomersData();


      const totalRevenue = salesData.reduce((sum, model) => sum + model.revenue, 0);
      const totalCustomers = totalCustomersData.reduce((sum, totalCustomers) => sum + totalCustomers.totalCustomers, 0); // could be dynamically fetched later
      const stockCount = stock.reduce((sum, part) => sum + part.quantity, 0);
      const deliveriesPending = logistics.consumer.reduce((sum, item) => sum + (item.delivered < 300 ? 1 : 0), 0);

      setStats({
        totalRevenue,
        totalCustomers,
        stockCount,
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
        <Link to="/reports/suppliers" className="card card-green">Supplier & Inventory Report</Link>
        <Link to="/reports/logistics/bulk" className="card card-purple">Bulk Logistics Report</Link>
        <Link to="/reports/logistics/consumer" className="card card-yellow">Consumer Logistics Report</Link>
        <Link to="/reports/production" className="card card-orange">Production Report</Link>
        <Link to="/reports/financial" className="card card-red">Financial Report</Link>
      </div>
      <div className="card card-gray">
        <p className="small-heading">Quick Stats:</p>
        <ul className="list">
          <li>Total Revenue: Ð {stats.totalRevenue.toLocaleString()}</li>
          <li>Customers: {stats.totalCustomers}</li>
          <li>Parts in Stock: {stats.stockCount}</li>
          <li>Deliveries Pending: {stats.deliveriesPending}</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="main-header">
      <div className="logo">ePhone Reports</div>
      <nav className="nav-links">
        <Link to="/">Dashboard</Link>
        <Link to="/reports/sales">Sales</Link>
        <Link to="/reports/financial">Financial</Link>
      </nav>
    </header>
  );
};

export default Header;

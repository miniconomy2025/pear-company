import React from 'react';
import './DateFilter.css';

interface DateFilterProps {
    fromDate: string;
    toDate: string;
    setFromDate: (date: string) => void;
    setToDate: (date: string) => void;
    onFilter: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ fromDate, toDate, setFromDate, setToDate, onFilter }) => {
    const today = new Date();

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const applyPreset = (range: '7days' | 'thisMonth') => {
        if (range === '7days') {
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            setFromDate(formatDate(lastWeek));
            setToDate(formatDate(today));
        } else if (range === 'thisMonth') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setFromDate(formatDate(start));
            setToDate(formatDate(end));
        }
    };

    return (
        <div className="filter-row styled-filters">
            <label>
                From Date:
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label>
                To Date:
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
            <button className="filter-btn" onClick={onFilter}>Apply Filter</button>
            <div className="preset-buttons">
                <button onClick={() => applyPreset('7days')} className="preset-btn">Last 7 Days</button>
                <button onClick={() => applyPreset('thisMonth')} className="preset-btn">This Month</button>
            </div>
        </div>
    );
};

export default DateFilter;


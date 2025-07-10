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

        </div>
    );
};

export default DateFilter;


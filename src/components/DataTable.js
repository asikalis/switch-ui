import React, { useState, useMemo } from 'react';
import './DataTable.css';

const DataTable = ({
    data = [],
    columns = [],
    loading = false,
    onEdit,
    onDelete,
    onBulkDelete,
    onResetPassword,
    searchable = true,
    sortable = true,
    paginated = true,
    pageSize = 10,
    pageSizeOptions = [5, 10, 25, 50, 100],
    title = "Data Table",
    actions = [],
    selectable = false
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPageSize, setCurrentPageSize] = useState(pageSize);
    const [jumpToPage, setJumpToPage] = useState('');
    const [sortConfig, setSortConfig] = useState({
        key: '',
        direction: 'asc'
    });
    const [filters, setFilters] = useState({});
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);

    // Handle sorting
    const handleSort = (key) => {
        if (!sortable) return;
        
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter and search data
    const filteredData = useMemo(() => {
        let filtered = [...data];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                columns.some(column => {
                    const value = item[column.key];
                    if (value === null || value === undefined) return false;
                    return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
                })
            );
        }

        // Apply column filters
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                filtered = filtered.filter(item => {
                    const value = item[key];
                    if (value === null || value === undefined) return false;
                    return value.toString().toLowerCase().includes(filters[key].toLowerCase());
                });
            }
        });

        return filtered;
    }, [data, searchTerm, filters, columns]);

    // Sort filtered data
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            let comparison = 0;
            if (aValue > bValue) {
                comparison = 1;
            } else if (aValue < bValue) {
                comparison = -1;
            }

            return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
        });
    }, [filteredData, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(sortedData.length / currentPageSize);
    const paginatedData = useMemo(() => {
        if (!paginated) return sortedData;
        
        const startIndex = (currentPage - 1) * currentPageSize;
        return sortedData.slice(startIndex, startIndex + currentPageSize);
    }, [sortedData, currentPage, currentPageSize, paginated]);

    // Handle page change
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpToPage('');
        }
    };

    // Handle page size change
    const handlePageSizeChange = (newPageSize) => {
        setCurrentPageSize(newPageSize);
        setCurrentPage(1); // Reset to first page when changing page size
    };

    // Handle jump to page
    const handleJumpToPage = (e) => {
        e.preventDefault();
        const pageNumber = parseInt(jumpToPage);
        if (pageNumber && pageNumber >= 1 && pageNumber <= totalPages) {
            handlePageChange(pageNumber);
        }
    };

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setCurrentPage(1); // Reset to first page when filtering
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setFilters({});
        setCurrentPage(1);
    };

    // Get pagination info
    const getPaginationInfo = () => {
        const startIndex = (currentPage - 1) * currentPageSize + 1;
        const endIndex = Math.min(currentPage * currentPageSize, filteredData.length);
        return {
            start: startIndex,
            end: endIndex,
            total: filteredData.length,
            originalTotal: data.length
        };
    };

    // Render cell content
    const renderCell = (item, column) => {
        if (column.render) {
            return column.render(item[column.key], item);
        }
        
        const value = item[column.key];
        if (value === null || value === undefined) return 'N/A';
        
        // Handle array values (like roles)
        if (Array.isArray(value)) {
            return value.map((val, index) => (
                <span key={index} className="data-table-array-item">
                    {typeof val === 'object' ? (val.name || val.role || val.toString()) : val.toString()}
                </span>
            ));
        }
        
        // Handle date formatting
        if (column.type === 'date' && value) {
            return new Date(value).toLocaleString('sv-SE');
        }
        
        return value.toString();
    };

    // Generate pagination numbers
    const getPaginationNumbers = () => {
        const numbers = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            numbers.push(i);
        }
        
        return numbers;
    };

    // Handle row selection
    const handleRowSelect = (itemId, isSelected) => {
        const newSelectedRows = new Set(selectedRows);
        if (isSelected) {
            newSelectedRows.add(itemId);
        } else {
            newSelectedRows.delete(itemId);
        }
        setSelectedRows(newSelectedRows);
        
        // Update select all state
        setSelectAll(newSelectedRows.size === paginatedData.length && paginatedData.length > 0);
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            const allIds = paginatedData.map(item => item.id || item.username);
            setSelectedRows(new Set(allIds));
        } else {
            setSelectedRows(new Set());
        }
        setSelectAll(isSelected);
    };

    // Handle bulk delete
    const handleBulkDelete = () => {
        if (selectedRows.size === 0) return;
        
        const selectedItems = Array.from(selectedRows);
        if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected user(s)?`)) {
            if (onBulkDelete) {
                onBulkDelete(selectedItems);
                setSelectedRows(new Set());
                setSelectAll(false);
            }
        }
    };

    // Clear selection when data changes
    React.useEffect(() => {
        setSelectedRows(new Set());
        setSelectAll(false);
    }, [data]);

    if (loading) {
        return (
            <div className="data-table-loading">
                <div className="data-table-spinner"></div>
                <p>Loading data...</p>
            </div>
        );
    }

    return (
        <div className="data-table-wrapper">
            <div className="data-table-header">
                <h3 className="data-table-title">{title}</h3>
                <div className="data-table-controls">
                    {searchable && (
                        <div className="data-table-search">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="data-table-search-input"
                            />
                        </div>
                    )}
                    {(searchTerm || Object.values(filters).some(f => f)) && (
                        <button
                            onClick={clearFilters}
                            className="data-table-clear-filters"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Column Filters */}
            <div className="data-table-filters">
                {columns.filter(col => col.filterable).map(column => (
                    <div key={column.key} className="data-table-filter">
                        <label>{column.header} Filter:</label>
                        <input
                            type="text"
                            placeholder={`Filter by ${column.header.toLowerCase()}`}
                            value={filters[column.key] || ''}
                            onChange={(e) => handleFilterChange(column.key, e.target.value)}
                            className="data-table-filter-input"
                        />
                    </div>
                ))}
            </div>

            {/* Data Info */}
            <div className="data-table-info">
                <div className="data-table-info-left">
                    <span>
                        Showing {getPaginationInfo().start} to {getPaginationInfo().end} of {getPaginationInfo().total} entries
                        {getPaginationInfo().total !== getPaginationInfo().originalTotal && ` (filtered from ${getPaginationInfo().originalTotal} total)`}
                    </span>
                </div>
                {selectable && selectedRows.size > 0 && (
                    <div className="data-table-bulk-actions">
                        <span className="selected-count">{selectedRows.size} selected</span>
                        {onBulkDelete && (
                            <button
                                onClick={handleBulkDelete}
                                className="bulk-action-btn bulk-delete"
                                title={`Delete ${selectedRows.size} selected users`}
                            >
                                🗑️ Delete Selected ({selectedRows.size})
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {selectable && (
                                <th className="select-column">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="select-all-checkbox"
                                        title="Select all visible rows"
                                    />
                                </th>
                            )}
                            {columns.map(column => (
                                <th
                                    key={column.key}
                                    className={`
                                        ${sortable && column.sortable !== false ? 'sortable' : ''}
                                        ${sortConfig.key === column.key ? 'sorted' : ''}
                                    `}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                >
                                    {column.header}
                                    {sortable && column.sortable !== false && (
                                        <span className="sort-indicator">
                                            {sortConfig.key === column.key ? (
                                                sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                                            ) : ' ↕'}
                                        </span>
                                    )}
                                </th>
                            ))}
                            {(onEdit || onDelete || onResetPassword || actions.length > 0) && (
                                <th className="actions-column">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td 
                                    colSpan={columns.length + (onEdit || onDelete || onResetPassword || actions.length > 0 ? 1 : 0) + (selectable ? 1 : 0)} 
                                    className="data-table-no-data"
                                >
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((item, index) => {
                                const itemId = item.id || item.username;
                                const isSelected = selectedRows.has(itemId);
                                
                                return (
                                    <tr key={itemId || index} className={isSelected ? 'selected-row' : ''}>
                                        {selectable && (
                                            <td className="select-column">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => handleRowSelect(itemId, e.target.checked)}
                                                    className="row-select-checkbox"
                                                />
                                            </td>
                                        )}
                                        {columns.map(column => (
                                            <td key={column.key} className={column.className || ''}>
                                                {renderCell(item, column)}
                                            </td>
                                        ))}
                                        {(onEdit || onDelete || onResetPassword || actions.length > 0) && (
                                            <td className="data-table-actions">
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(item)}
                                                        className="data-table-action-btn edit"
                                                        title="Edit"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                )}
                                                {onResetPassword && (
                                                    <button
                                                        onClick={() => onResetPassword(item.username)}
                                                        className="data-table-action-btn reset"
                                                        title="Reset Password"
                                                    >
                                                        🔑 Reset
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(item.id || item.username)}
                                                        className="data-table-action-btn delete"
                                                        title="Delete"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                                {actions.map((action, actionIndex) => (
                                                    <button
                                                        key={actionIndex}
                                                        onClick={() => action.onClick(item)}
                                                        className={`data-table-action-btn ${action.className || ''}`}
                                                        title={action.title}
                                                    >
                                                        {action.icon && <span>{action.icon}</span>}
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {paginated && totalPages > 1 && (
                <div className="data-table-pagination">
                    <div className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="pagination-controls">
                        <button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            «
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            ‹
                        </button>
                        
                        {getPaginationNumbers().map(number => (
                            <button
                                key={number}
                                onClick={() => handlePageChange(number)}
                                className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                            >
                                {number}
                            </button>
                        ))}
                        
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            ›
                        </button>
                        <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            »
                        </button>
                    </div>
                    <div className="pagination-size">
                        <label>
                            Show 
                            <select
                                value={currentPageSize}
                                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                                className="pagination-size-select"
                            >
                                {pageSizeOptions.map(size => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                            entries per page
                        </label>
                    </div>
                    <div className="pagination-jump">
                        <form onSubmit={handleJumpToPage}>
                            <label>
                                Jump to page:
                                <input
                                    type="number"
                                    value={jumpToPage}
                                    onChange={(e) => setJumpToPage(e.target.value)}
                                    className="pagination-jump-input"
                                    min="1"
                                    max={totalPages}
                                />
                            </label>
                            <button type="submit" className="pagination-jump-btn">
                                Go
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
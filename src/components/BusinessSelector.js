import React, { useState, useEffect } from 'react';
import API from '../api/api';
import './BusinessSelector.css';

const BusinessSelector = ({ onBusinessChange, onNotification }) => {
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [availableBusinesses, setAvailableBusinesses] = useState([]);
    const [businessesLoading, setBusinessesLoading] = useState(false);
    const [showBusinessModal, setShowBusinessModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterBy, setFilterBy] = useState('all');
    const [newBusinessForm, setNewBusinessForm] = useState({
        name: '',
        type: '',
        description: '',
        location: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        logourl: '',
        status: 'Active'
    });
    const [formErrors, setFormErrors] = useState({});
    const [isFormValid, setIsFormValid] = useState(false);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [isDuplicateName, setIsDuplicateName] = useState(false);

    // Common business types for quick selection
    const businessTypes = [
        { value: 'Technology', icon: '💻', popular: true },
        { value: 'Retail', icon: '🛍️', popular: true },
        { value: 'Finance', icon: '💰', popular: true },
        { value: 'Healthcare', icon: '🏥', popular: true },
        { value: 'Energy', icon: '⚡', popular: false },
        { value: 'Manufacturing', icon: '🏭', popular: false },
        { value: 'Services', icon: '🛠️', popular: true },
        { value: 'Education', icon: '🎓', popular: false },
        { value: 'Food & Beverage', icon: '🍽️', popular: true },
        { value: 'Real Estate', icon: '🏢', popular: false },
        { value: 'Transportation', icon: '🚚', popular: false },
        { value: 'Entertainment', icon: '🎬', popular: false },
        { value: 'Agriculture', icon: '🌾', popular: false },
        { value: 'Consulting', icon: '📊', popular: true },
        { value: 'Other', icon: '📦', popular: false }
    ];

    // Popular location suggestions
    const locationSuggestions = [
        'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
        'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
        'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
        'San Francisco, CA', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
        'Boston, MA', 'Nashville, TN', 'Miami, FL', 'Atlanta, GA'
    ];

    // Create new business
    const createBusiness = async (businessData) => {
        try {
            // Final validation before submission
            if (!validateForm(businessData)) {
                onNotification?.({
                    show: true,
                    message: 'Please fix the form errors before submitting',
                    type: 'error'
                });
                return;
            }

            setCreateLoading(true);
            
            // Clean and format data
            const cleanedData = {
                name: businessData.name.trim(),
                type: businessData.type,
                description: businessData.description.trim(),
                location: businessData.location.trim(),
                status: businessData.status,
                created_at: new Date().toISOString()
            };

            const { data } = await API.post('/businesses', cleanedData);
            
            let createdBusiness = data;
            if (data.return_body) {
                createdBusiness = data.return_body;
            } else if (data.business) {
                createdBusiness = data.business;
            }
            
            setAvailableBusinesses(prev => [...prev, createdBusiness]);
            
            onNotification?.({
                show: true,
                message: `Business "${createdBusiness.name}" created successfully!`,
                type: 'success'
            });
            
            resetForm();
            setShowCreateModal(false);
            
            return createdBusiness;
        } catch (err) {
            console.error("Error creating business:", err);
            
            // Enhanced error handling
            let errorMessage = 'Failed to create business. Please try again.';
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.status === 409) {
                errorMessage = 'A business with this name already exists.';
            } else if (err.response?.status === 400) {
                errorMessage = 'Invalid business data. Please check your inputs.';
            }
            
            onNotification?.({
                show: true,
                message: errorMessage,
                type: 'error'
            });
            throw err;
        } finally {
            setCreateLoading(false);
        }
    };

    // Update business
    const updateBusiness = async (businessId, businessData) => {
        try {
            const { data } = await API.put(`/businesses/${businessId}`, businessData);
            
            let updatedBusiness = data;
            if (data.return_body) {
                updatedBusiness = data.return_body;
            } else if (data.business) {
                updatedBusiness = data.business;
            }
            
            setAvailableBusinesses(prev => 
                prev.map(business => 
                    business.id === businessId ? updatedBusiness : business
                )
            );
            
            if (selectedBusiness?.id === businessId) {
                setSelectedBusiness(updatedBusiness);
                localStorage.setItem('selectedBusiness', JSON.stringify(updatedBusiness));
                onBusinessChange?.(updatedBusiness);
            }
            
            onNotification?.({
                show: true,
                message: `Business "${updatedBusiness.name}" updated successfully!`,
                type: 'success'
            });
            
            return updatedBusiness;
        } catch (err) {
            console.error("Error updating business:", err);
            onNotification?.({
                show: true,
                message: 'Failed to update business. Please try again.',
                type: 'error'
            });
            throw err;
        }
    };

    // Delete business
    const deleteBusiness = async (businessId) => {
        try {
            await API.delete(`/businesses/${businessId}`);
            
            setAvailableBusinesses(prev => 
                prev.filter(business => business.id !== businessId)
            );
            
            if (selectedBusiness?.id === businessId) {
                setSelectedBusiness(null);
                localStorage.removeItem('selectedBusiness');
                onBusinessChange?.(null);
            }
            
            onNotification?.({
                show: true,
                message: 'Business deleted successfully!',
                type: 'success'
            });
        } catch (err) {
            console.error("Error deleting business:", err);
            onNotification?.({
                show: true,
                message: 'Failed to delete business. Please try again.',
                type: 'error'
            });
            throw err;
        }
    };

    // Get single business
    const getBusiness = async (businessId) => {
        try {
            const { data } = await API.get(`/businesses/${businessId}`);
            
            let business = data;
            if (data.return_body) {
                business = data.return_body;
            } else if (data.business) {
                business = data.business;
            }
            
            return business;
        } catch (err) {
            console.error("Error fetching business:", err);
            throw err;
        }
    };

    // Enhanced name validation with real-time duplicate checking
    const checkDuplicateName = (name) => {
        if (!name.trim()) return false;
        const isDuplicate = availableBusinesses.some(
            business => business.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        setIsDuplicateName(isDuplicate);
        return isDuplicate;
    };

    // Filter and sort businesses for the switch modal
    const getFilteredBusinesses = () => {
        let filtered = availableBusinesses;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(business =>
                business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                business.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (business.location && business.location.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply status filter
        if (filterBy !== 'all') {
            filtered = filtered.filter(business => business.status?.toLowerCase() === filterBy);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    return a.type.localeCompare(b.type);
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                case 'created':
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    };

    // Quick business creation with templates
    const createBusinessFromTemplate = async (template) => {
        const templateData = {
            ...template,
            name: `${template.name} ${Date.now()}`, // Ensure unique name
            status: 'Active'
        };
        
        setNewBusinessForm(templateData);
        await createBusiness(templateData);
    };

    // Business templates for quick creation
    const businessTemplates = [
        {
            name: 'Tech Startup',
            type: 'Technology',
            description: 'Innovative technology solutions and software development',
            location: 'San Francisco, CA'
        },
        {
            name: 'Local Retail Store',
            type: 'Retail',
            description: 'Community-focused retail business',
            location: 'New York, NY'
        },
        {
            name: 'Consulting Firm',
            type: 'Consulting',
            description: 'Professional consulting and advisory services',
            location: 'Chicago, IL'
        },
        {
            name: 'Health Services',
            type: 'Healthcare',
            description: 'Healthcare and wellness services',
            location: 'Boston, MA'
        }
    ];

    // Form validation
    const validateForm = (formData = newBusinessForm) => {
        const errors = {};
        
        // Name validation with enhanced checks
        if (!formData.name.trim()) {
            errors.name = 'Business name is required';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Business name must be at least 2 characters';
        } else if (formData.name.trim().length > 100) {
            errors.name = 'Business name must be less than 100 characters';
        } else if (checkDuplicateName(formData.name)) {
            errors.name = 'A business with this name already exists';
        } else if (!/^[a-zA-Z0-9\s\-_.&]+$/.test(formData.name)) {
            errors.name = 'Business name contains invalid characters';
        }
        
        // Type validation
        if (!formData.type) {
            errors.type = 'Business type is required';
        }
        
        // Location validation with format checking
        if (formData.location) {
            if (formData.location.length > 200) {
                errors.location = 'Location must be less than 200 characters';
            } else if (!/^[a-zA-Z0-9\s,.-]+$/.test(formData.location)) {
                errors.location = 'Location contains invalid characters';
            }
        }
        
        // Description validation
        if (formData.description && formData.description.length > 500) {
            errors.description = 'Description must be less than 500 characters';
        }

        // Address validation
        if (formData.address && formData.address.length > 300) {
            errors.address = 'Address must be less than 300 characters';
        }

        // Phone validation
        if (formData.phone && !/^\+?[0-9\s\-()]+$/.test(formData.phone)) {
            errors.phone = 'Phone number contains invalid characters';
        }

        // Email validation
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email address';
        }

        // GST Number validation
        if (formData.gstNumber && formData.gstNumber.length > 15) {
            errors.gstNumber = 'GST Number must be less than 15 characters';
        }

        // Logo URL validation
        if (formData.logourl && formData.logourl.length > 500) {
            errors.logourl = 'Logo URL must be less than 500 characters';
        }
        
        setFormErrors(errors);
        const valid = Object.keys(errors).length === 0;
        setIsFormValid(valid);
        return valid;
    };

    // Enhanced form change handler with debounced validation
    const handleFormChange = (field, value) => {
        const updatedForm = {
            ...newBusinessForm,
            [field]: value
        };
        
        setNewBusinessForm(updatedForm);
        
        // Real-time validation with debouncing
        setTimeout(() => {
            validateForm(updatedForm);
        }, 300);
        
        // Auto-suggest business name based on type and location
        if (field === 'type' && !updatedForm.name.trim()) {
            generateBusinessNameSuggestion(updatedForm);
        }
    };

    // Generate business name suggestion
    const generateBusinessNameSuggestion = (formData) => {
        if (formData.type && !formData.name) {
            const typeMapping = {
                'Technology': ['Tech Solutions', 'Digital Systems', 'Innovation Labs'],
                'Retail': ['Retail Plus', 'Commerce Hub', 'Market Solutions'],
                'Finance': ['Financial Services', 'Capital Solutions', 'Investment Group'],
                'Healthcare': ['Health Solutions', 'Medical Services', 'Wellness Group'],
                'Energy': ['Energy Solutions', 'Power Systems', 'Green Energy'],
                'Services': ['Professional Services', 'Expert Solutions', 'Service Excellence']
            };
            
            const suggestions = typeMapping[formData.type] || ['Business Solutions'];
            const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
            
            // Don't auto-fill if user has already started typing
            if (!formData.name.trim()) {
                setNewBusinessForm(prev => ({
                    ...prev,
                    name: randomSuggestion
                }));
            }
        }
    };

    // Reset form with validation
    const resetForm = () => {
        setNewBusinessForm({
            name: '',
            type: '',
            description: '',
            location: '',
            address: '',
            phone: '',
            email: '',
            gstNumber: '',
            logourl: '',
            status: 'Active'
        });
        setFormErrors({});
        setIsFormValid(false);
        setShowLocationSuggestions(false);
    };

    // Enhanced form submission
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            // Focus on first error field
            const firstErrorField = Object.keys(formErrors)[0];
            const errorElement = document.getElementById(`business${firstErrorField.charAt(0).toUpperCase() + firstErrorField.slice(1)}`);
            errorElement?.focus();
            return;
        }
        
        await createBusiness(newBusinessForm);
    };

    // Handle location suggestions
    const handleLocationSelect = (location) => {
        handleFormChange('location', location);
        setShowLocationSuggestions(false);
    };

    // Fetch business options from API
    const fetchBusinessOptions = async () => {
        try {
            setBusinessesLoading(true);
            const { data } = await API.get('/businesses');
            console.log("Business data:", data);
            
            let businesses = [];
            if (data.return_body && Array.isArray(data.return_body)) {
                businesses = data.return_body;
            } else if (Array.isArray(data)) {
                businesses = data;
            } else if (data.businesses && Array.isArray(data.businesses)) {
                businesses = data.businesses;
            } else {
                businesses = [
                    { 
                        id: 1, 
                        name: 'Tech Solutions Inc.', 
                        type: 'Technology', 
                        status: 'Active',
                        description: 'Leading technology solutions provider',
                        location: 'San Francisco, CA'
                    },
                    { 
                        id: 2, 
                        name: 'Green Energy Corp.', 
                        type: 'Energy', 
                        status: 'Active',
                        description: 'Renewable energy solutions',
                        location: 'Austin, TX'
                    },
                    { 
                        id: 3, 
                        name: 'Retail Plus Ltd.', 
                        type: 'Retail', 
                        status: 'Active',
                        description: 'Modern retail solutions',
                        location: 'New York, NY'
                    },
                    { 
                        id: 4, 
                        name: 'Finance Pro Services', 
                        type: 'Finance', 
                        status: 'Active',
                        description: 'Professional financial services',
                        location: 'Chicago, IL'
                    },
                    { 
                        id: 5, 
                        name: 'Healthcare Innovation', 
                        type: 'Healthcare', 
                        status: 'Active',
                        description: 'Advanced healthcare solutions',
                        location: 'Boston, MA'
                    }
                ];
            }
            
            setAvailableBusinesses(businesses);
            
            if (!selectedBusiness && businesses.length > 0) {
                const defaultBusiness = businesses[0];
                setSelectedBusiness(defaultBusiness);
                localStorage.setItem('selectedBusiness', JSON.stringify(defaultBusiness));
                onBusinessChange?.(defaultBusiness);
            }
        } catch (err) {
            console.error("Error fetching businesses:", err);
            const fallbackBusinesses = [
                { 
                    id: 1, 
                    name: 'Tech Solutions Inc.', 
                    type: 'Technology', 
                    status: 'Active',
                    description: 'Leading technology solutions provider',
                    location: 'San Francisco, CA'
                },
                { 
                    id: 2, 
                    name: 'Green Energy Corp.', 
                    type: 'Energy', 
                    status: 'Active',
                    description: 'Renewable energy solutions',
                    location: 'Austin, TX'
                },
                { 
                    id: 3, 
                    name: 'Retail Plus Ltd.', 
                    type: 'Retail', 
                    status: 'Active',
                    description: 'Modern retail solutions',
                    location: 'New York, NY'
                }
            ];
            setAvailableBusinesses(fallbackBusinesses);
            
            if (!selectedBusiness) {
                const defaultBusiness = fallbackBusinesses[0];
                setSelectedBusiness(defaultBusiness);
                localStorage.setItem('selectedBusiness', JSON.stringify(defaultBusiness));
                onBusinessChange?.(defaultBusiness);
            }
        } finally {
            setBusinessesLoading(false);
        }
    };

    useEffect(() => {
        const savedBusiness = localStorage.getItem('selectedBusiness');
        if (savedBusiness) {
            try {
                const business = JSON.parse(savedBusiness);
                setSelectedBusiness(business);
                onBusinessChange?.(business);
            } catch (e) {
                console.error("Error parsing saved business:", e);
            }
        }
        fetchBusinessOptions();
    }, []);

    const handleBusinessSelect = (business) => {
        setSelectedBusiness(business);
        localStorage.setItem('selectedBusiness', JSON.stringify(business));
        setShowBusinessModal(false);
        onBusinessChange?.(business);
        
        onNotification?.({
            show: true,
            message: `Switched to ${business.name}`,
            type: 'success'
        });
    };

    return (
        <div className="business-selector">
            <div className="business-header">
                <h2>Business Overview</h2>
                <div className="business-header-actions">
                    <div className="quick-actions-dropdown">
                        <button className="quick-create-button">
                            ⚡ Quick Create
                        </button>
                        <div className="quick-actions-menu">
                            {businessTemplates.map((template, index) => (
                                <button
                                    key={index}
                                    className="template-button"
                                    onClick={() => createBusinessFromTemplate(template)}
                                >
                                    {businessTypes.find(t => t.value === template.type)?.icon} {template.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button 
                        className="business-create-button"
                        onClick={() => setShowCreateModal(true)}
                    >
                        ➕ Create Business
                    </button>
                    <button 
                        className="business-switch-button"
                        onClick={() => setShowBusinessModal(true)}
                        disabled={businessesLoading}
                    >
                        🏢 Switch Business ({availableBusinesses.length})
                    </button>
                </div>
            </div>
            
            {selectedBusiness ? (
                <div className="current-business-card">
                    <div className="business-info">
                        <h3>{selectedBusiness.name}</h3>
                        <div className="business-details">
                            <p><strong>Type:</strong> {selectedBusiness.type}</p>
                            <p><strong>Status:</strong> 
                                <span className={`business-status ${selectedBusiness.status?.toLowerCase()}`}>
                                    {selectedBusiness.status}
                                </span>
                            </p>
                            {selectedBusiness.location && (
                                <p><strong>Location:</strong> {selectedBusiness.location}</p>
                            )}
                            {selectedBusiness.description && (
                                <p><strong>Description:</strong> {selectedBusiness.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="business-actions">
                        <button 
                            className="business-action-button"
                            onClick={() => setShowBusinessModal(true)}
                        >
                            Change Business
                        </button>
                    </div>
                </div>
            ) : (
                <div className="no-business-selected">
                    <div className="no-business-icon">🏢</div>
                    <h3>No business selected</h3>
                    <p>Select a business to view its overview and analytics</p>
                    <button 
                        className="select-business-button"
                        onClick={() => setShowBusinessModal(true)}
                        disabled={businessesLoading}
                    >
                        {businessesLoading ? 'Loading...' : 'Select Business'}
                    </button>
                </div>
            )}

            {selectedBusiness && (
                <div className="business-analytics">
                    <h3>Business Analytics</h3>
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <div className="analytics-icon">📊</div>
                            <h4>Performance</h4>
                            <p>Business performance metrics and KPIs</p>
                            <div className="analytics-value">+12.5%</div>
                        </div>
                        <div className="analytics-card">
                            <div className="analytics-icon">👥</div>
                            <h4>Team</h4>
                            <p>Manage team members and roles</p>
                            <div className="analytics-value">24 Members</div>
                        </div>
                        <div className="analytics-card">
                            <div className="analytics-icon">📈</div>
                            <h4>Revenue</h4>
                            <p>Monthly revenue and growth trends</p>
                            <div className="analytics-value">$45.2K</div>
                        </div>
                        <div className="analytics-card">
                            <div className="analytics-icon">⚙️</div>
                            <h4>Settings</h4>
                            <p>Configure business settings and preferences</p>
                            <div className="analytics-value">Configure</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Business Switch Modal */}
            {showBusinessModal && (
                <div className="modal-overlay">
                    <div className="modal-content business-modal enhanced">
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <span className="modal-icon">🏢</span>
                                Switch Business
                            </h3>
                            <button 
                                className="modal-close-button"
                                onClick={() => setShowBusinessModal(false)}
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Search and Filter Controls */}
                        <div className="business-controls">
                            <div className="search-container">
                                <input
                                    type="text"
                                    placeholder="Search businesses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                <span className="search-icon">🔍</span>
                            </div>
                            
                            <div className="filter-controls">
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="sort-select"
                                >
                                    <option value="name">Sort by Name</option>
                                    <option value="type">Sort by Type</option>
                                    <option value="status">Sort by Status</option>
                                    <option value="created">Sort by Created Date</option>
                                </select>
                                
                                <select 
                                    value={filterBy} 
                                    onChange={(e) => setFilterBy(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                    <option value="pending">Pending Only</option>
                                </select>
                            </div>
                        </div>
                        
                        {businessesLoading ? (
                            <div className="loading-state">
                                <div className="loading-spinner"></div>
                                <p>Loading businesses...</p>
                            </div>
                        ) : (
                            <div className="business-list enhanced">
                                {getFilteredBusinesses().length === 0 ? (
                                    <div className="no-results">
                                        <div className="no-results-icon">🔍</div>
                                        <h4>No businesses found</h4>
                                        <p>Try adjusting your search or filter criteria</p>
                                        <button 
                                            className="create-new-button"
                                            onClick={() => {
                                                setShowBusinessModal(false);
                                                setShowCreateModal(true);
                                            }}
                                        >
                                            Create New Business
                                        </button>
                                    </div>
                                ) : (
                                    getFilteredBusinesses().map((business) => (
                                        <div 
                                            key={business.id} 
                                            className={`business-option enhanced ${selectedBusiness?.id === business.id ? 'selected' : ''}`}
                                            onClick={() => handleBusinessSelect(business)}
                                        >
                                            <div className="business-option-header">
                                                <div className="business-icon">
                                                    {businessTypes.find(t => t.value === business.type)?.icon || '🏢'}
                                                </div>
                                                <div className="business-option-info">
                                                    <h4>{business.name}</h4>
                                                    <div className="business-meta">
                                                        <span className="business-type">{business.type}</span>
                                                        <span className={`business-status ${business.status?.toLowerCase()}`}>
                                                            {business.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                {selectedBusiness?.id === business.id && (
                                                    <div className="business-selected-indicator">
                                                        ✅ Current
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {business.location && (
                                                <p className="business-location">📍 {business.location}</p>
                                            )}
                                            
                                            {business.description && (
                                                <p className="business-description">{business.description}</p>
                                            )}
                                            
                                            <div className="business-actions">
                                                <button 
                                                    className="action-button switch"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleBusinessSelect(business);
                                                    }}
                                                >
                                                    Switch to This Business
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        
                        <div className="modal-footer">
                            <div className="business-count">
                                {getFilteredBusinesses().length} of {availableBusinesses.length} businesses
                            </div>
                            <div className="footer-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowBusinessModal(false)}
                                    className="modal-button cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBusinessModal(false);
                                        setShowCreateModal(true);
                                    }}
                                    className="modal-button create-new"
                                >
                                    ➕ Create New
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Create Business Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content create-business-modal enhanced">
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <span className="modal-icon">✨</span>
                                Create New Business
                            </h3>
                            <button 
                                className="modal-close-button"
                                onClick={() => {
                                    resetForm();
                                    setShowCreateModal(false);
                                }}
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="form-progress">
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ 
                                        width: `${((newBusinessForm.name ? 1 : 0) + 
                                                (newBusinessForm.type ? 1 : 0) + 
                                                (newBusinessForm.location ? 1 : 0) + 
                                                (newBusinessForm.description ? 1 : 0)) / 4 * 100}%` 
                                    }}
                                ></div>
                            </div>
                            <span className="progress-text">
                                {Math.round(((newBusinessForm.name ? 1 : 0) + 
                                           (newBusinessForm.type ? 1 : 0) + 
                                           (newBusinessForm.location ? 1 : 0) + 
                                           (newBusinessForm.description ? 1 : 0)) / 4 * 100)}% Complete
                            </span>
                        </div>

                        {/* Quick Templates Section */}
                        <div className="quick-templates">
                            <h4>Quick Start Templates</h4>
                            <div className="template-grid">
                                {businessTemplates.map((template, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="template-card"
                                        onClick={() => {
                                            setNewBusinessForm({
                                                ...template,
                                                name: template.name,
                                                status: 'Active'
                                            });
                                            validateForm({...template, status: 'Active'});
                                        }}
                                    >
                                        <span className="template-icon">
                                            {businessTypes.find(t => t.value === template.type)?.icon}
                                        </span>
                                        <span className="template-name">{template.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit} className="enhanced-form">
                            {/* Business Name Field with real-time validation */}
                            <div className={`form-group ${formErrors.name ? 'error' : ''} ${newBusinessForm.name ? 'filled' : ''} ${isDuplicateName ? 'duplicate' : ''}`}>
                                <label htmlFor="businessName">
                                    Business Name *
                                    <span className="field-icon">🏢</span>
                                </label>
                                <input
                                    id="businessName"
                                    type="text"
                                    value={newBusinessForm.name}
                                    onChange={(e) => {
                                        handleFormChange('name', e.target.value);
                                        checkDuplicateName(e.target.value);
                                    }}
                                    placeholder="Enter your business name"
                                    className={formErrors.name ? 'error' : ''}
                                    maxLength="100"
                                    required
                                />
                                {isDuplicateName && !formErrors.name && (
                                    <div className="duplicate-warning">
                                        ⚠️ This name is already taken. Try a variation.
                                    </div>
                                )}
                                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                                <div className="char-counter">{newBusinessForm.name.length}/100</div>
                            </div>
                            
                            {/* Business Type Field */}
                            <div className={`form-group ${formErrors.type ? 'error' : ''} ${newBusinessForm.type ? 'filled' : ''}`}>
                                <label htmlFor="businessType">
                                    Business Type *
                                    <span className="field-icon">📊</span>
                                </label>
                                <div className="business-type-grid">
                                    {businessTypes.filter(type => type.popular).map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`type-button ${newBusinessForm.type === type.value ? 'selected' : ''}`}
                                            onClick={() => handleFormChange('type', type.value)}
                                        >
                                            <span className="type-icon">{type.icon}</span>
                                            <span className="type-name">{type.value}</span>
                                        </button>
                                    ))}
                                </div>
                                <select
                                    id="businessType"
                                    value={newBusinessForm.type}
                                    onChange={(e) => handleFormChange('type', e.target.value)}
                                    className={formErrors.type ? 'error' : ''}
                                    required
                                >
                                    <option value="">Or select from all types...</option>
                                    {businessTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.icon} {type.value}
                                        </option>
                                    ))}
                                </select>
                                {formErrors.type && <span className="error-message">{formErrors.type}</span>}
                            </div>
                            
                            {/* Location Field with Suggestions */}
                            <div className={`form-group ${formErrors.location ? 'error' : ''} ${newBusinessForm.location ? 'filled' : ''}`}>
                                <label htmlFor="businessLocation">
                                    Location
                                    <span className="field-icon">📍</span>
                                </label>
                                <div className="location-input-container">
                                    <input
                                        id="businessLocation"
                                        type="text"
                                        value={newBusinessForm.location}
                                        onChange={(e) => handleFormChange('location', e.target.value)}
                                        onFocus={() => setShowLocationSuggestions(true)}
                                        placeholder="Enter business location"
                                        className={formErrors.location ? 'error' : ''}
                                        maxLength="200"
                                    />
                                    {showLocationSuggestions && (
                                        <div className="location-suggestions">
                                            {locationSuggestions
                                                .filter(loc => 
                                                    !newBusinessForm.location || 
                                                    loc.toLowerCase().includes(newBusinessForm.location.toLowerCase())
                                                )
                                                .slice(0, 8)
                                                .map(location => (
                                                    <button
                                                        key={location}
                                                        type="button"
                                                        className="location-suggestion"
                                                        onClick={() => handleLocationSelect(location)}
                                                    >
                                                        📍 {location}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                                {formErrors.location && <span className="error-message">{formErrors.location}</span>}
                                <div className="char-counter">{newBusinessForm.location.length}/200</div>
                            </div>
                            
                            {/* Description Field */}
                            <div className={`form-group ${formErrors.description ? 'error' : ''} ${newBusinessForm.description ? 'filled' : ''}`}>
                                <label htmlFor="businessDescription">
                                    Description
                                    <span className="field-icon">📝</span>
                                </label>
                                <textarea
                                    id="businessDescription"
                                    value={newBusinessForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    placeholder="Describe your business (optional)"
                                    rows="4"
                                    className={formErrors.description ? 'error' : ''}
                                    maxLength="500"
                                />
                                {formErrors.description && <span className="error-message">{formErrors.description}</span>}
                                <div className="char-counter">{newBusinessForm.description.length}/500</div>
                            </div>

                            {/* Address Field */}
                            <div className={`form-group ${formErrors.address ? 'error' : ''} ${newBusinessForm.address ? 'filled' : ''}`}>
                                <label htmlFor="businessAddress">
                                    Address
                                    <span className="field-icon">🏠</span>
                                </label>
                                <textarea
                                    id="businessAddress"
                                    value={newBusinessForm.address}
                                    onChange={(e) => handleFormChange('address', e.target.value)}
                                    placeholder="Enter business address (optional)"
                                    rows="3"
                                    className={formErrors.address ? 'error' : ''}
                                    maxLength="300"
                                />
                                {formErrors.address && <span className="error-message">{formErrors.address}</span>}
                                <div className="char-counter">{newBusinessForm.address.length}/300</div>
                            </div>

                            {/* Phone Field */}
                            <div className={`form-group ${formErrors.phone ? 'error' : ''} ${newBusinessForm.phone ? 'filled' : ''}`}>
                                <label htmlFor="businessPhone">
                                    Phone Number
                                    <span className="field-icon">📞</span>
                                </label>
                                <input
                                    id="businessPhone"
                                    type="tel"
                                    value={newBusinessForm.phone}
                                    onChange={(e) => handleFormChange('phone', e.target.value)}
                                    placeholder="Enter phone number (optional)"
                                    className={formErrors.phone ? 'error' : ''}
                                    maxLength="20"
                                />
                                {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                            </div>

                            {/* Email Field */}
                            <div className={`form-group ${formErrors.email ? 'error' : ''} ${newBusinessForm.email ? 'filled' : ''}`}>
                                <label htmlFor="businessEmail">
                                    Email
                                    <span className="field-icon">📧</span>
                                </label>
                                <input
                                    id="businessEmail"
                                    type="email"
                                    value={newBusinessForm.email}
                                    onChange={(e) => handleFormChange('email', e.target.value)}
                                    placeholder="Enter email address (optional)"
                                    className={formErrors.email ? 'error' : ''}
                                    maxLength="100"
                                />
                                {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                            </div>

                            {/* GST Number Field */}
                            <div className={`form-group ${formErrors.gstNumber ? 'error' : ''} ${newBusinessForm.gstNumber ? 'filled' : ''}`}>
                                <label htmlFor="businessGstNumber">
                                    GST Number
                                    <span className="field-icon">🏛️</span>
                                </label>
                                <input
                                    id="businessGstNumber"
                                    type="text"
                                    value={newBusinessForm.gstNumber}
                                    onChange={(e) => handleFormChange('gstNumber', e.target.value)}
                                    placeholder="Enter GST number (optional)"
                                    className={formErrors.gstNumber ? 'error' : ''}
                                    maxLength="15"
                                />
                                {formErrors.gstNumber && <span className="error-message">{formErrors.gstNumber}</span>}
                            </div>

                            {/* Logo URL Field */}
                            <div className={`form-group ${formErrors.logourl ? 'error' : ''} ${newBusinessForm.logourl ? 'filled' : ''}`}>
                                <label htmlFor="businessLogoUrl">
                                    Logo URL
                                    <span className="field-icon">🖼️</span>
                                </label>
                                <input
                                    id="businessLogoUrl"
                                    type="url"
                                    value={newBusinessForm.logourl}
                                    onChange={(e) => handleFormChange('logourl', e.target.value)}
                                    placeholder="Enter logo URL (optional)"
                                    className={formErrors.logourl ? 'error' : ''}
                                    maxLength="500"
                                />
                                {formErrors.logourl && <span className="error-message">{formErrors.logourl}</span>}
                                {newBusinessForm.logourl && (
                                    <div className="logo-preview">
                                        <img 
                                            src={newBusinessForm.logourl} 
                                            alt="Logo preview" 
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                            style={{maxWidth: '100px', maxHeight: '50px'}}
                                        />
                                        <span style={{display: 'none', color: '#ff6b6b'}}>Invalid image URL</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Status Field */}
                            <div className="form-group filled">
                                <label htmlFor="businessStatus">
                                    Status
                                    <span className="field-icon">⚡</span>
                                </label>
                                <div className="status-options">
                                    {['Active', 'Inactive', 'Pending'].map(status => (
                                        <label key={status} className="status-option">
                                            <input
                                                type="radio"
                                                name="status"
                                                value={status}
                                                checked={newBusinessForm.status === status}
                                                onChange={(e) => handleFormChange('status', e.target.value)}
                                            />
                                            <span className={`status-label ${status.toLowerCase()}`}>
                                                {status === 'Active' && '✅'}
                                                {status === 'Inactive' && '⏸️'}
                                                {status === 'Pending' && '⏳'}
                                                {status}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="modal-footer enhanced">
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        setShowCreateModal(false);
                                    }}
                                    className="modal-button cancel"
                                    disabled={createLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`modal-button create ${isFormValid ? 'valid' : 'invalid'}`}
                                    disabled={createLoading || !isFormValid || isDuplicateName}
                                >
                                    {createLoading ? (
                                        <>
                                            <span className="loading-spinner small"></span>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <span className="button-icon">✨</span>
                                            Create Business
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Click outside to close location suggestions */}
            {showLocationSuggestions && (
                <div 
                    className="location-suggestions-overlay"
                    onClick={() => setShowLocationSuggestions(false)}
                ></div>
            )}
        </div>
    );
};

export default BusinessSelector;
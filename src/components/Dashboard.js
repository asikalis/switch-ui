import React, { useEffect, useState, useCallback } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import DataTable from "../components/DataTable";
import BusinessSelector from "../components/BusinessSelector";
import { usePasswordReset } from "../hooks/usePasswordReset";
import "./Dashboard.css";

function Dashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        username: '',
        email: '',
        password: '',
        firstname: '',
        lastname: '',
        displayname: '',
        dateofbirthDt: '',
        gender: '',
        roles: ['ROLE_USER']
    });
    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: 'success' // 'success' or 'error'
    });
    // Add state for selected business
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    
    const [sortBy, setSortBy] = useState('createdDt');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    // Add new state for roles
    const [availableRoles, setAvailableRoles] = useState([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    
    // Add state for role management
    const [roles, setRoles] = useState([]);
    const [rolesDataLoading, setRolesDataLoading] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [editRoleFormData, setEditRoleFormData] = useState({});
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [createRoleFormData, setCreateRoleFormData] = useState({
        name: '',
        description: ''
    });

    const navigate = useNavigate();

    // Use the password reset hook
    const { openResetPasswordModal, ResetPasswordModal } = usePasswordReset();

    console.log("user..:", user);

    // Add function to fetch roles from API
    const fetchRoles = async () => {
        try {
            setRolesLoading(true);
            const { data } = await API.get('/roles');
            console.log("Roles data:", data);
            
            // Handle different response formats
            let roles = [];
            if (data.return_body && Array.isArray(data.return_body)) {
                roles = data.return_body;
            } else if (Array.isArray(data)) {
                roles = data;
            } else if (data.roles && Array.isArray(data.roles)) {
                roles = data.roles;
            }
            
            // Extract role names/values for the select options
            const roleOptions = roles.map(role => {
                if (typeof role === 'string') {
                    return role;
                } else if (role.name) {
                    return role.name;
                } else if (role.role) {
                    return role.role;
                } else if (role.value) {
                    return role.value;
                } else {
                    return 'ROLE_USER'; // fallback
                }
            });
            
            // Add default roles if not present
            const defaultRoles = ['ROLE_USER', 'ROLE_ADMIN'];
            const uniqueRoles = [...new Set([...defaultRoles, ...roleOptions])];
            
            setAvailableRoles(uniqueRoles);
        } catch (err) {
            console.error("Error fetching roles:", err);
            // Fallback to default roles if API fails
            setAvailableRoles(['ROLE_USER', 'ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_EDITOR']);
        } finally {
            setRolesLoading(false);
        }
    };

    // Fetch roles when component mounts or when modals are opened
    useEffect(() => {
        fetchRoles();
    }, []);

    const hasAdminPermission = useCallback(() => {
        let userRole = user?.return_body?.roles || user?.roles;
        
        // Safely handle different role formats
        if (!userRole) {
            return false;
        }
        
        // Convert to array format for consistent checking
        if (typeof userRole === 'string') {
            userRole = [userRole];
        } else if (typeof userRole === 'object' && !Array.isArray(userRole)) {
            if (userRole.name) {
                userRole = [userRole.name];
            } else {
                userRole = Object.values(userRole).filter(Boolean);
            }
        }
        
        // Check if user has admin role
        if (Array.isArray(userRole) && userRole.includes("ROLE_ADMIN")) {
            return true;
        }

        // Fallback: check token payload
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.roles?.includes("ROLE_ADMIN")) {
                    return true;
                }
            } catch (e) {
                console.error("Error decoding JWT token for roles check:", e);
            }
        }

        return false;
    }, [user]);

    const getUsernameFromAuth = useCallback(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                if (userData.username) {
                    return userData.username;
                }
                if (userData.email) {
                    return userData.email.split('@')[0];
                }
            } catch (e) {
                console.error("Error parsing stored user data:", e);
            }
        }

        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.username) {
                    return payload.username;
                }
                if (payload.email) {
                    return payload.email.split('@')[0];
                }
                if (payload.sub) {
                    return payload.sub;
                }
            } catch (e) {
                console.error("Error decoding JWT token:", e);
            }
        }

        return null;
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const username = getUsernameFromAuth();
                if (!username) {
                    throw new Error("No username found in authentication data");
                }

                console.log("Fetching user profile for username:", username);
                const { data } = await API.get(`/users/${username}`);
                console.log("Profile data received:", data);
                setUser(data);
                setError("");
            } catch (err) {
                console.error("Dashboard API error:", err);
                console.error("Error response:", err.response?.data);
                const errorMessage = err.response?.data?.message ||
                    err.response?.data?.error ||
                    `API Error: ${err.response?.status} - ${err.message}`;
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [getUsernameFromAuth, navigate]);

    const fetchUsers = async () => {
        try {
            setUsersLoading(true);
            const { data } = await API.get('/users');
            console.log("Users data:", data);
            if (data.return_body && Array.isArray(data.return_body)) {
                setUsers(data.return_body);
            } else if (Array.isArray(data)) {
                setUsers(data);
            } else {
                setUsers([]);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "users") {
            fetchUsers();
        }
    }, [activeTab]);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) {
            return;
        }

        try {
            await API.delete(`/users/${userId}`);
            setNotification({
                show: true,
                message: "User deleted successfully!",
                type: 'success'
            });
            fetchUsers();
        } catch (err) {
            console.error("Error deleting user:", err);
            setNotification({
                show: true,
                message: "Failed to delete user: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleBulkDeleteUsers = async (userIds) => {
        try {
            // Create array of delete promises
            const deletePromises = userIds.map(userId => 
                API.delete(`/users/${userId}`)
            );
            
            // Execute all delete operations
            await Promise.allSettled(deletePromises);
            
            setNotification({
                show: true,
                message: `Successfully deleted ${userIds.length} user(s)!`,
                type: 'success'
            });
            
            // Refresh the users list
            fetchUsers();
        } catch (err) {
            console.error("Error during bulk delete:", err);
            setNotification({
                show: true,
                message: "Failed to delete some users: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        
        // Properly handle existing roles to ensure they're selected in the multi-select
        let existingRoles = [];
        if (user.roles) {
            if (Array.isArray(user.roles)) {
                existingRoles = user.roles.map(role => {
                    // Handle case where role might be an object with name property
                    return typeof role === 'object' ? (role.name || role.role || 'ROLE_USER') : role;
                });
            } else if (typeof user.roles === 'string') {
                existingRoles = [user.roles];
            } else if (typeof user.roles === 'object') {
                // Handle object with name property
                if (user.roles.name) {
                    existingRoles = [user.roles.name];
                } else {
                    // Convert object values to array
                    existingRoles = Object.values(user.roles).filter(Boolean);
                }
            }
        }
        
        // Fallback to default role if no roles found
        if (existingRoles.length === 0) {
            existingRoles = ['ROLE_USER'];
        }
        
        setEditFormData({
            username: user.username || '',
            email: user.email || '',
            firstname: user.firstname || '',
            lastname: user.lastname || '',
            displayname: user.displayname || '',
            dateofbirthDt: user.dateofbirthDt || '',
            gender: user.gender || '',
            roles: existingRoles
        });
        setShowEditModal(true);
    };

    const handleCreateUser = () => {
        setCreateFormData({
            username: '',
            email: '',
            password: '',
            firstname: '',
            lastname: '',
            displayname: '',
            dateofbirthDt: '',
            gender: '',
            roles: ['ROLE_USER']
        });
        setShowCreateModal(true);
    };

    const handleCreateFormChange = (e) => {
        const { name, value, type } = e.target;

        if (name === 'roles') {
            // Handle multi-select for roles
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            console.log("Selected roles:", selectedOptions); // Debug log
            setCreateFormData({
                ...createFormData,
                [name]: selectedOptions
            });
        } else {
            setCreateFormData({
                ...createFormData,
                [name]: value
            });
        }
    };

    // Add a helper function to handle role checkbox changes
    const handleRoleCheckboxChange = (roleValue, isChecked) => {
        console.log(`Role ${roleValue} ${isChecked ? 'checked' : 'unchecked'}`);
        
        let updatedRoles;
        if (isChecked) {
            // Add role if checked and not already present
            updatedRoles = createFormData.roles.includes(roleValue) 
                ? createFormData.roles 
                : [...createFormData.roles, roleValue];
        } else {
            // Remove role if unchecked
            updatedRoles = createFormData.roles.filter(role => role !== roleValue);
        }
        
        // Ensure at least one role is always selected
        if (updatedRoles.length === 0) {
            updatedRoles = ['ROLE_USER'];
        }
        
        console.log("Updated roles:", updatedRoles);
        setCreateFormData({
            ...createFormData,
            roles: updatedRoles
        });
    };

    // Add a helper function to handle role checkbox changes for edit form
    const handleEditRoleCheckboxChange = (roleValue, isChecked) => {
        console.log(`Edit - Role ${roleValue} ${isChecked ? 'checked' : 'unchecked'}`);
        
        let updatedRoles;
        if (isChecked) {
            // Add role if checked and not already present
            updatedRoles = editFormData.roles.includes(roleValue) 
                ? editFormData.roles 
                : [...editFormData.roles, roleValue];
        } else {
            // Remove role if unchecked
            updatedRoles = editFormData.roles.filter(role => role !== roleValue);
        }
        
        // Ensure at least one role is always selected
        if (updatedRoles.length === 0) {
            updatedRoles = ['ROLE_USER'];
        }
        
        console.log("Edit - Updated roles:", updatedRoles);
        setEditFormData({
            ...editFormData,
            roles: updatedRoles
        });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();

        try {
            // Add debugging to check what data is being sent
            console.log("Creating user with data:", createFormData);
            
            // Ensure all fields are properly formatted and included
            const userData = {
                username: createFormData.username,
                email: createFormData.email,
                password: createFormData.password,
                firstname: createFormData.firstname || null,
                lastname: createFormData.lastname || null,
                displayname: createFormData.displayname || null,
                dateofbirthDt: createFormData.dateofbirthDt || null,
                gender: createFormData.gender || null,
                roles: Array.isArray(createFormData.roles) && createFormData.roles.length > 0 
                    ? createFormData.roles 
                    : ['ROLE_USER']
            };
            
            console.log("Processed user data being sent to API:", userData);
            
            await API.post('/users', userData);
            setNotification({
                show: true,
                message: "User created successfully!",
                type: 'success'
            });
            setShowCreateModal(false);
            setCreateFormData({
                username: '',
                email: '',
                password: '',
                firstname: '',
                lastname: '',
                displayname: '',
                dateofbirthDt: '',
                gender: '',
                roles: ['ROLE_USER']
            });
            fetchUsers();
        } catch (err) {
            console.error("Error creating user:", err);
            console.error("Error response data:", err.response?.data);
            setNotification({
                show: true,
                message: "Failed to create user: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;

        if (name === 'roles') {
            // Handle multi-select for roles
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
            setEditFormData({
                ...editFormData,
                [name]: selectedOptions
            });
        } else {
            setEditFormData({
                ...editFormData,
                [name]: value
            });
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        try {
            const userId = editingUser.id || editingUser.username;
            await API.put(`/users/${userId}`, editFormData);
            setNotification({
                show: true,
                message: "User updated successfully!",
                type: 'success'
            });
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            console.error("Error updating user:", err);
            setNotification({
                show: true,
                message: "Failed to update user: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            // Toggle sort order if same column
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column and default to descending for dates
            setSortBy(column);
            setSortOrder(column === 'createdDt' ? 'desc' : 'asc');
        }
    };

    const sortUsers = (usersToSort) => {
        return [...usersToSort].sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'createdDt':
                    aValue = new Date(a.createdDt);
                    bValue = new Date(b.createdDt);
                    break;
                case 'username':
                    aValue = (a.username || '').toLowerCase();
                    bValue = (b.username || '').toLowerCase();
                    break;
                case 'email':
                    aValue = (a.email || '').toLowerCase();
                    bValue = (b.email || '').toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpiration");
        navigate("/login");
    };

    // Add notification dismissal function
    const dismissNotification = () => {
        setNotification({
            show: false,
            message: '',
            type: 'success'
        });
    };

    // Auto-dismiss notifications after 5 seconds
    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                dismissNotification();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    // Role management functions
    const fetchRolesData = async () => {
        try {
            setRolesDataLoading(true);
            const { data } = await API.get('/roles');
            console.log("Roles data for management:", data);
            
            // Handle different response formats
            let rolesData = [];
            if (data.return_body && Array.isArray(data.return_body)) {
                rolesData = data.return_body;
            } else if (Array.isArray(data)) {
                rolesData = data;
            } else if (data.roles && Array.isArray(data.roles)) {
                rolesData = data.roles;
            } else {
                // If API returns simple array of role names, create objects
                rolesData = ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_EDITOR'].map((role, index) => ({
                    id: index + 1,
                    name: role,
                    description: `${role.replace('ROLE_', '').toLowerCase()} role`,
                    createdDt: new Date().toISOString()
                }));
            }
            
            setRoles(rolesData);
        } catch (err) {
            console.error("Error fetching roles data:", err);
            // Fallback data if API fails
            setRoles([
                { id: 1, name: 'ROLE_USER', description: 'Standard user role', createdDt: new Date().toISOString() },
                { id: 2, name: 'ROLE_ADMIN', description: 'Administrator role', createdDt: new Date().toISOString() },
                { id: 3, name: 'ROLE_MODERATOR', description: 'Moderator role', createdDt: new Date().toISOString() },
                { id: 4, name: 'ROLE_EDITOR', description: 'Editor role', createdDt: new Date().toISOString() }
            ]);
        } finally {
            setRolesDataLoading(false);
        }
    };

    const handleDeleteRole = async (roleId) => {
        if (!window.confirm("Are you sure you want to delete this role?")) {
            return;
        }

        try {
            await API.delete(`/roles/${roleId}`);
            setNotification({
                show: true,
                message: "Role deleted successfully!",
                type: 'success'
            });
            fetchRolesData();
        } catch (err) {
            console.error("Error deleting role:", err);
            setNotification({
                show: true,
                message: "Failed to delete role: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleBulkDeleteRoles = async (roleIds) => {
        try {
            const deletePromises = roleIds.map(roleId => 
                API.delete(`/roles/${roleId}`)
            );
            
            await Promise.allSettled(deletePromises);
            
            setNotification({
                show: true,
                message: `Successfully deleted ${roleIds.length} role(s)!`,
                type: 'success'
            });
            
            fetchRolesData();
        } catch (err) {
            console.error("Error during bulk delete roles:", err);
            setNotification({
                show: true,
                message: "Failed to delete some roles: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleEditRole = (role) => {
        setEditingRole(role);
        setEditRoleFormData({
            name: role.name || '',
            description: role.description || ''
        });
        setShowEditRoleModal(true);
    };

    const handleCreateRole = () => {
        setCreateRoleFormData({
            name: '',
            description: ''
        });
        setShowCreateRoleModal(true);
    };

    const handleCreateRoleFormChange = (e) => {
        const { name, value } = e.target;
        setCreateRoleFormData({
            ...createRoleFormData,
            [name]: value
        });
    };

    const handleEditRoleFormChange = (e) => {
        const { name, value } = e.target;
        setEditRoleFormData({
            ...editRoleFormData,
            [name]: value
        });
    };

    const handleCreateRoleSubmit = async (e) => {
        e.preventDefault();

        try {
            console.log("Creating role with data:", createRoleFormData);
            
            await API.post('/roles', createRoleFormData);
            setNotification({
                show: true,
                message: "Role created successfully!",
                type: 'success'
            });
            setShowCreateRoleModal(false);
            setCreateRoleFormData({
                name: '',
                description: ''
            });
            fetchRolesData();
            fetchRoles(); // Refresh available roles for user management
        } catch (err) {
            console.error("Error creating role:", err);
            setNotification({
                show: true,
                message: "Failed to create role: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    const handleEditRoleSubmit = async (e) => {
        e.preventDefault();

        try {
            const roleId = editingRole.id || editingRole.name;
            await API.put(`/roles/${roleId}`, editRoleFormData);
            setNotification({
                show: true,
                message: "Role updated successfully!",
                type: 'success'
            });
            setShowEditRoleModal(false);
            setEditingRole(null);
            fetchRolesData();
            fetchRoles(); // Refresh available roles for user management
        } catch (err) {
            console.error("Error updating role:", err);
            setNotification({
                show: true,
                message: "Failed to update role: " + (err.response?.data?.message || err.message),
                type: 'error'
            });
        }
    };

    // Add function to handle business change
    const handleBusinessChange = (business) => {
        setSelectedBusiness(business);
        console.log("Selected business changed:", business);
    };

    // Add function to handle business selector notifications
    const handleBusinessNotification = (notificationData) => {
        setNotification(notificationData);
    };

    useEffect(() => {
        if (activeTab === "users") {
            fetchUsers();
        } else if (activeTab === "roles") {
            fetchRolesData();
        }
    }, [activeTab]);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <h2>Loading Dashboard...</h2>
                <p>Please wait while we fetch your profile.</p>
            </div>
        );
    }

    if (error) {
        return (
            <>
                <Header onLogout={logout} user={user} />
                <div className="dashboard-container">
                    <div className="dashboard-sidebar">
                        <nav>
                            <ul className="dashboard-nav">
                                <li>
                                    <button
                                        onClick={() => setActiveTab("overview")}
                                        className="dashboard-nav-button active"
                                    >
                                        📊 Overview
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    <div className="dashboard-main-content dashboard-content-padding">
                        <div className="dashboard-error-container">
                            <h2>Dashboard - Limited Access</h2>
                            <div className="dashboard-error-notice">
                                <p><strong>Notice:</strong> {error}</p>
                                <p>You have limited access to the dashboard. Some features may not be available.</p>
                            </div>
                        </div>

                        <div>
                            <h3>Welcome to Your Dashboard</h3>
                            <p>You are successfully logged in, but some profile information couldn't be loaded.</p>
                            <p>Available features:</p>
                            <ul className="dashboard-feature-list">
                                <li>Basic dashboard access</li>
                                <li>Account logout functionality</li>
                            </ul>

                            <div className="dashboard-error-actions">
                                <button
                                    onClick={() => navigate("/login")}
                                    className="dashboard-button-primary"
                                >
                                    Go to Login
                                </button>
                                <button
                                    onClick={logout}
                                    className="dashboard-button-danger"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const renderOverviewTab = () => (
        <div className="dashboard-content-padding">
            {/* User Welcome Section - Moved to top */}
            <div className="overview-welcome">
                <h2>Welcome, {user?.return_body?.username || user?.name || "User"}!</h2>
                {selectedBusiness && (
                    <p className="business-context">
                        You are currently managing <strong>{selectedBusiness.name}</strong>
                    </p>
                )}
            </div>

            {/* Business Selector Component */}
            <BusinessSelector 
                onBusinessChange={handleBusinessChange}
                onNotification={handleBusinessNotification}
            />
        </div>
    );

    const renderUsersTab = () => {
        const isAdmin = hasAdminPermission();
        
        // Define columns for the DataTable
        const userColumns = [
            {
                key: 'username',
                header: 'Username',
                sortable: true,
                filterable: true
            },
            {
                key: 'email',
                header: 'Email',
                sortable: true,
                filterable: true
            },
            {
                key: 'firstname',
                header: 'Firstname',
                sortable: true,
                filterable: true
            },
            {
                key: 'lastname',
                header: 'Lastname',
                sortable: true,
                filterable: true
            },
            {
                key: 'displayname',
                header: 'Displayname',
                sortable: true,
                filterable: false
            },
            {
                key: 'gender',
                header: 'Gender',
                sortable: true,
                filterable: false
            },
            {
                key: 'dateofbirthDt',
                header: 'Date Of Birth',
                sortable: true,
                filterable: true
            },
            {
                key: 'phonenumber',
                header: 'Phone Number',
                sortable: true,
                filterable: false
            },
            // {
            //     key: 'roles',
            //     header: 'Roles',
            //     sortable: false,
            //     render: (roles, user) => {
            //         // Handle different role formats
            //         let processedRoles = roles;
                    
            //         if (!processedRoles) {
            //             processedRoles = ['ROLE_USER'];
            //         } else if (typeof processedRoles === 'string') {
            //             processedRoles = [processedRoles];
            //         } else if (typeof processedRoles === 'object' && !Array.isArray(processedRoles)) {
            //             if (processedRoles.name) {
            //                 processedRoles = [processedRoles.name];
            //             } else {
            //                 processedRoles = Object.values(processedRoles).filter(Boolean);
            //             }
            //         } else if (!Array.isArray(processedRoles)) {
            //             processedRoles = ['ROLE_USER'];
            //         }
                    
            //         return processedRoles.map((role, roleIndex) => {
            //             const roleText = typeof role === 'object' ? (role.name || role.role || 'ROLE_USER') : role;
            //             return (
            //                 <span
            //                     key={roleIndex}
            //                     className="data-table-array-item"
            //                     style={{ marginRight: '4px' }}
            //                 >
            //                     {roleText}
            //                 </span>
            //             );
            //         });
            //     }
            // },
            {
                key: 'createdDt',
                header: 'Created Date',
                type: 'date',
                sortable: true,
                render: (date) => new Date(date).toLocaleString('sv-SE')
            }
        ];

        return (
            <div className="dashboard-content-padding">
                {/* Show role-based welcome message */}
                <div className="users-tab-header">
                    <h2>Users Directory</h2>
                    {!isAdmin && (
                        <div className="user-role-notice">
                            <p><strong>Note:</strong> You have view-only access to the users directory. Contact an administrator for user management actions.</p>
                        </div>
                    )}
                </div>

                {/* Show create/refresh buttons only for admins */}
                {isAdmin && (
                    <div className="users-header">
                        <div className="users-header-actions">
                            <button
                                onClick={handleCreateUser}
                                className="users-create-button"
                            >
                                ➕ Create New User
                            </button>
                            <button
                                onClick={fetchUsers}
                                className="users-refresh-button"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                )}

                {/* Show refresh button for non-admins */}
                {!isAdmin && (
                    <div className="users-header">
                        <div className="users-header-actions">
                            <button
                                onClick={fetchUsers}
                                className="users-refresh-button"
                            >
                                🔄 Refresh Directory
                            </button>
                        </div>
                    </div>
                )}

                <DataTable
                    data={users}
                    columns={userColumns}
                    loading={usersLoading}
                    onEdit={isAdmin ? handleEditUser : null}
                    onDelete={isAdmin ? handleDeleteUser : null}
                    onResetPassword={isAdmin ? openResetPasswordModal : null}
                    onBulkDelete={isAdmin ? handleBulkDeleteUsers : null}
                    title={isAdmin ? "User Management" : "Users Directory"}
                    searchable={true}
                    sortable={true}
                    paginated={true}
                    pageSize={10}
                    selectable={isAdmin}
                />

                {/* Admin-only modals */}
                {isAdmin && (
                    <>
                        {/* Edit User Modal */}
                        {showEditModal && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                                    <div className="modal-header">
                                        <h3 className="modal-title">Edit User</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditModal(false)}
                                            className="modal-close-button"
                                            aria-label="Close modal"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <form onSubmit={handleEditSubmit}>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Username:</label>
                                            <input
                                                type="text"
                                                name="username"
                                                value={editFormData.username}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Email:</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={editFormData.email}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                                required
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">First Name:</label>
                                            <input
                                                type="text"
                                                name="firstname"
                                                value={editFormData.firstname}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Last Name:</label>
                                            <input
                                                type="text"
                                                name="lastname"
                                                value={editFormData.lastname}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Display Name:</label>
                                            <input
                                                type="text"
                                                name="displayname"
                                                value={editFormData.displayname}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Date of Birth:</label>
                                            <input
                                                type="date"
                                                name="dateofbirthDt"
                                                value={editFormData.dateofbirthDt}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Gender:</label>
                                            <select
                                                name="gender"
                                                value={editFormData.gender}
                                                onChange={handleEditFormChange}
                                                className="modal-input"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="modal-form-group buttons">
                                            <label className="modal-label">Roles:</label>
                                            <div className="roles-checkbox-container">
                                                {rolesLoading ? (
                                                    <div>Loading roles...</div>
                                                ) : (
                                                    availableRoles.map(role => (
                                                        <div key={role} className="role-checkbox-item">
                                                            <label className="checkbox-label">
                                                                <input
                                                                    type="checkbox"
                                                                    value={role}
                                                                    checked={editFormData.roles.includes(role)}
                                                                    onChange={(e) => handleEditRoleCheckboxChange(role, e.target.checked)}
                                                                    className="role-checkbox"
                                                                />
                                                                <span className="checkbox-text">{role}</span>
                                                            </label>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="roles-selection-info">
                                                Selected roles: {editFormData.roles.join(', ')}
                                                {rolesLoading && <span> - Loading available roles...</span>}
                                            </div>
                                        </div>
                                        <div className="modal-buttons">
                                            <button
                                                type="button"
                                                onClick={() => setShowEditModal(false)}
                                                className="modal-button cancel"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="modal-button submit"
                                            >
                                                Update User
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Create User Modal */}
                        {showCreateModal && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                                    <div className="modal-header">
                                        <h3 className="modal-title">Create New User</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="modal-close-button"
                                            aria-label="Close modal"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateSubmit}>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Username:</label>
                                            <input
                                                type="text"
                                                name="username"
                                                value={createFormData.username}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Email:</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={createFormData.email}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                                required
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Password:</label>
                                            <input
                                                type="password"
                                                name="password"
                                                value={createFormData.password}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                                required
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">First Name:</label>
                                            <input
                                                type="text"
                                                name="firstname"
                                                value={createFormData.firstname}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Last Name:</label>
                                            <input
                                                type="text"
                                                name="lastname"
                                                value={createFormData.lastname}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Display Name:</label>
                                            <input
                                                type="text"
                                                name="displayname"
                                                value={createFormData.displayname}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Date of Birth:</label>
                                            <input
                                                type="date"
                                                name="dateofbirthDt"
                                                value={createFormData.dateofbirthDt}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Gender:</label>
                                            <select
                                                name="gender"
                                                value={createFormData.gender}
                                                onChange={handleCreateFormChange}
                                                className="modal-input"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="modal-form-group buttons">
                                            <label className="modal-label">Roles:</label>
                                            <div className="roles-checkbox-container">
                                                {rolesLoading ? (
                                                    <div>Loading roles...</div>
                                                ) : (
                                                    availableRoles.map(role => (
                                                        <div key={role} className="role-checkbox-item">
                                                            <label className="checkbox-label">
                                                                <input
                                                                    type="checkbox"
                                                                    value={role}
                                                                    checked={createFormData.roles.includes(role)}
                                                                    onChange={(e) => handleRoleCheckboxChange(role, e.target.checked)}
                                                                    className="role-checkbox"
                                                                />
                                                                <span className="checkbox-text">{role}</span>
                                                            </label>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="roles-selection-info">
                                                Selected roles: {createFormData.roles.join(', ')}
                                                {rolesLoading && <span> - Loading available roles...</span>}
                                            </div>
                                        </div>
                                        <div className="modal-buttons">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateModal(false)}
                                                className="modal-button cancel"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="modal-button submit"
                                            >
                                                Create User
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderRolesTab = () => {
        const isAdmin = hasAdminPermission();
        
        // Define columns for the Role DataTable
        const roleColumns = [
            {
                key: 'name',
                header: 'Role Name',
                sortable: true,
                filterable: true
            },
            {
                key: 'description',
                header: 'Description',
                sortable: true,
                filterable: true
            },
            {
                key: 'createdDt',
                header: 'Created Date',
                type: 'date',
                sortable: true,
                render: (date) => new Date(date).toLocaleString('sv-SE')
            }
        ];

        return (
            <div className="dashboard-content-padding">
                {/* Show role-based welcome message */}
                <div className="roles-tab-header">
                    <h2>Role Management</h2>
                    {!isAdmin && (
                        <div className="user-role-notice">
                            <p><strong>Note:</strong> You have view-only access to the roles directory. Contact an administrator for role management actions.</p>
                        </div>
                    )}
                </div>

                {/* Show create/refresh buttons only for admins */}
                {isAdmin && (
                    <div className="users-header">
                        <div className="users-header-actions">
                            <button
                                onClick={handleCreateRole}
                                className="users-create-button"
                            >
                                ➕ Create New Role
                            </button>
                            <button
                                onClick={fetchRolesData}
                                className="users-refresh-button"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                )}

                {/* Show refresh button for non-admins */}
                {!isAdmin && (
                    <div className="users-header">
                        <div className="users-header-actions">
                            <button
                                onClick={fetchRolesData}
                                className="users-refresh-button"
                            >
                                🔄 Refresh Directory
                            </button>
                        </div>
                    </div>
                )}

                <DataTable
                    data={roles}
                    columns={roleColumns}
                    loading={rolesDataLoading}
                    onEdit={isAdmin ? handleEditRole : null}
                    onDelete={isAdmin ? handleDeleteRole : null}
                    onBulkDelete={isAdmin ? handleBulkDeleteRoles : null}
                    title={isAdmin ? "Role Management" : "Roles Directory"}
                    searchable={true}
                    sortable={true}
                    paginated={true}
                    pageSize={10}
                    selectable={isAdmin}
                />

                {/* Admin-only modals */}
                {isAdmin && (
                    <>
                        {/* Edit Role Modal */}
                        {showEditRoleModal && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3 className="modal-title">Edit Role</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditRoleModal(false)}
                                            className="modal-close-button"
                                            aria-label="Close modal"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <form onSubmit={handleEditRoleSubmit}>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Role Name:</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={editRoleFormData.name}
                                                onChange={handleEditRoleFormChange}
                                                className="modal-input"
                                                required
                                                autoFocus
                                                placeholder="e.g., ROLE_MANAGER"
                                            />
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Description:</label>
                                            <input
                                                type="text"
                                                name="description"
                                                value={editRoleFormData.description}
                                                onChange={handleEditRoleFormChange}
                                                className="modal-input"
                                                required
                                                placeholder="Brief description of the role"
                                            />
                                        </div>
                                        <div className="modal-buttons">
                                            <button
                                                type="button"
                                                onClick={() => setShowEditRoleModal(false)}
                                                className="modal-button cancel"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="modal-button submit"
                                            >
                                                Update Role
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Create Role Modal */}
                        {showCreateRoleModal && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3 className="modal-title">Create New Role</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateRoleModal(false)}
                                            className="modal-close-button"
                                            aria-label="Close modal"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateRoleSubmit}>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Role Name:</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={createRoleFormData.name}  
                                                onChange={handleCreateRoleFormChange}
                                                className="modal-input"
                                                required
                                                autoFocus
                                                placeholder="e.g., ROLE_MANAGER"
                                            />
                                            <small style={{ color: '#666', fontSize: '12px' }}>
                                                Role names typically start with "ROLE_" (e.g., ROLE_MANAGER, ROLE_EDITOR)
                                            </small>
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Description:</label>
                                            <input
                                                type="text"
                                                name="description"
                                                value={createRoleFormData.description}
                                                onChange={handleCreateRoleFormChange}
                                                className="modal-input"
                                                required
                                                placeholder="Brief description of the role"
                                            />
                                        </div>
                                        <div className="modal-buttons">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateRoleModal(false)}
                                                className="modal-button cancel"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="modal-button submit"
                                            >
                                                Create Role
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <Header onLogout={logout} user={user} />
            {/* Add notification component */}
            {notification.show && (
                <div className={`notification ${notification.type}`}>
                    <div className="notification-content">
                        <span className="notification-message">{notification.message}</span>
                        <button 
                            className="notification-close"
                            onClick={dismissNotification}
                            aria-label="Close notification"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            <div className="dashboard-container">
                <div className="dashboard-sidebar">
                    <nav>
                        <ul className="dashboard-nav">
                            <li>
                                <button
                                    onClick={() => setActiveTab("overview")}
                                    className={`dashboard-nav-button ${activeTab === "overview" ? "active" : "inactive"}`}
                                >
                                    📊 Overview
                                </button>
                            </li>
                            {hasAdminPermission() && (
                                <li>
                                    <button
                                        onClick={() => setActiveTab("users")}
                                        className={`dashboard-nav-button ${activeTab === "users" ? "active" : "inactive"}`}
                                    >
                                        👥 Users
                                    </button>
                                </li>
                            )}
                            {hasAdminPermission() && (
                                <li>
                                    <button
                                        onClick={() => setActiveTab("roles")}
                                        className={`dashboard-nav-button ${activeTab === "roles" ? "active" : "inactive"}`}
                                    >
                                        🔐 Roles
                                    </button>
                                </li>
                            )}
                            {hasAdminPermission() && (
                                <li>
                                    <button
                                        onClick={() => setActiveTab("admin")}
                                        className={`dashboard-nav-button ${activeTab === "admin" ? "active" : "inactive"}`}
                                    >
                                        ⚙️ Admin Panel
                                    </button>
                                </li>
                            )}
                        </ul>
                    </nav>
                </div>

                <div className="dashboard-main-content">
                    {activeTab === "overview" && renderOverviewTab()}
                    {activeTab === "users" && renderUsersTab()}
                    {activeTab === "roles" && renderRolesTab()}
                    {activeTab === "admin" && hasAdminPermission() && (
                        <div className="dashboard-content-padding">
                            <h2>Admin Panel</h2>
                            <p>Admin-specific features will be implemented here.</p>
                        </div>
                    )}
                </div>
            </div>
            <Footer />

            {/* Reset Password Modal */}
            <ResetPasswordModal />
        </>
    );
}

export default Dashboard;
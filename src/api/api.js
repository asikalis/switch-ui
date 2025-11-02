import axios from "axios";

const API = axios.create({
    baseURL: "/api/v1" // Use relative URL to work with proxy
    // timeout: 10000, // Add timeout
});

// Request interceptor - Attach token if available
API.interceptors.request.use(
    (req) => {
        const token = localStorage.getItem("token");
        if (token) {
            req.headers.Authorization = `Bearer ${token}`;
        }
        // Add content-type header for POST requests
        if (req.method === 'post' && !req.headers['Content-Type']) {
            req.headers['Content-Type'] = 'application/json';
        }
        return req;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle 403 and other auth errors
API.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        
        // Handle 403 Forbidden or 401 Unauthorized
        if (error.response?.status === 403 || error.response?.status === 401) {
            console.log('Authentication failed - clearing token');
            localStorage.removeItem("token");
            
            // Only redirect if we're not already on login/signup pages
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/signup') {
                window.location.href = '/login';
            }
        }
        
        return Promise.reject(error);
    }
);

// API Functions
export const resetPassword = async (username, newPassword) => {
    try {
        const response = await API.put(`/users/${username}/reset-password`, {
            newPassword: newPassword
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Add function to fetch roles from the server
export const fetchRoles = async () => {
    try {
        const response = await API.get('/roles');
        return response.data;
    } catch (error) {
        console.error('Error fetching roles:', error);
        throw error;
    }
};

export default API;

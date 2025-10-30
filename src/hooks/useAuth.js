import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import JWTValidator from '../api/jwtValidator';

// Custom hook for JWT token management and validation
export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Initialize authentication state
    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (!storedToken) {
                setIsLoading(false);
                return;
            }

            // Validate the stored token
            const validation = await JWTValidator.validateToken(storedToken);
            
            if (validation.isValid) {
                setToken(storedToken);
                setUser(validation.user || (storedUser ? JSON.parse(storedUser) : null));
                setIsAuthenticated(true);
            } else {
                // Token is invalid, clear auth data
                if (validation.shouldClearToken) {
                    logout();
                }
                setError('Session expired. Please log in again.');
            }
        } catch (err) {
            console.error('Auth initialization error:', err);
            setError('Authentication error occurred');
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    // Login function
    const login = useCallback(async (loginToken, userData = null, expiresIn = null) => {
        try {
            // Validate token format
            if (!JWTValidator.isValidJWTFormat(loginToken)) {
                throw new Error('Invalid token format');
            }

            // Store token with expiration
            JWTValidator.storeToken(loginToken, expiresIn);
            
            // Store user data if provided
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
            }

            setToken(loginToken);
            setIsAuthenticated(true);
            setError(null);

            return { success: true };
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed');
            return { success: false, error: err.message };
        }
    }, []);

    // Logout function
    const logout = useCallback(() => {
        JWTValidator.clearAuthData();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        navigate('/login');
    }, [navigate]);

    // Check if token expires soon
    const checkTokenExpiration = useCallback(() => {
        if (!token) return false;
        
        const expiresSoon = JWTValidator.tokenExpiresSoon(token, 5); // Check if expires within 5 minutes
        
        if (expiresSoon) {
            setError('Your session will expire soon. Please refresh or log in again.');
            return true;
        }
        
        return false;
    }, [token]);

    // Refresh token validation
    const refreshAuth = useCallback(async () => {
        if (!token) return false;

        try {
            const validation = await JWTValidator.validateToken(token);
            
            if (!validation.isValid) {
                logout();
                return false;
            }

            // Update user data if available
            if (validation.user) {
                setUser(validation.user);
                localStorage.setItem('user', JSON.stringify(validation.user));
            }

            return true;
        } catch (err) {
            console.error('Auth refresh error:', err);
            logout();
            return false;
        }
    }, [token, logout]);

    // Get token payload
    const getTokenPayload = useCallback(() => {
        if (!token) return null;
        return JWTValidator.getTokenPayload(token);
    }, [token]);

    // Get time until expiration
    const getTimeUntilExpiration = useCallback(() => {
        if (!token) return null;
        return JWTValidator.getTimeUntilExpiration(token);
    }, [token]);

    return {
        // State
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        
        // Actions
        login,
        logout,
        refreshAuth,
        checkTokenExpiration,
        
        // Utils
        getTokenPayload,
        getTimeUntilExpiration,
        
        // Clear error
        clearError: () => setError(null)
    };
};

export default useAuth;
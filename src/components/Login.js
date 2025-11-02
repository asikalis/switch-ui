import React, { useState, useEffect } from "react";
import API from "../api/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import "../App.css"; // Import CSS styles

function Login() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Check if user is already logged in when component mounts
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            // Verify token is still valid
            verifyToken(token);
        }
    }, []);

    // Method 1: Client-side JWT token validation (basic check)
    const isTokenExpired = (token) => {
        try {
            // Decode JWT payload (without verification - just for expiration check)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000; // Convert to seconds
            
            // Check if token has expired
            return payload.exp && payload.exp < currentTime;
        } catch (error) {
            console.error('Error decoding token:', error);
            return true; // Consider invalid tokens as expired
        }
    };

    // Method 2: Check stored expiration time
    const isStoredTokenExpired = () => {
        const expirationTime = localStorage.getItem("tokenExpiration");
        if (expirationTime) {
            return Date.now() > parseInt(expirationTime);
        }
        return false;
    };

    // Method 3: Server-side token verification - REMOVED
    // No longer using server-side verification

    // Combined token validation method - Updated to use only client-side validation
    const verifyToken = async (token) => {
        try {
            // Step 1: Validate token format
            if (!isValidJWTFormat(token)) {
                console.log('Invalid token format');
                clearAuthData();
                return;
            }

            // Step 2: Check token expiration (client-side)
            if (isTokenExpired(token) || isStoredTokenExpired()) {
                console.log('Token expired (client-side check)');
                clearAuthData();
                return;
            }

            // Token is valid and not expired, proceed to dashboard
            console.log('Token is valid, proceeding to post-login (dashboard)');
            navigate("/dashboard");
        } catch (err) {
            console.error('Token verification error:', err);
            clearAuthData();
        }
    };

    // Utility function to clear authentication data
    const clearAuthData = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpiration");
    };

    // Method 4: Validate token format (basic structure check)
    const isValidJWTFormat = (token) => {
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            // Try to decode each part
            JSON.parse(atob(parts[0])); // Header
            JSON.parse(atob(parts[1])); // Payload
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Basic validation
        if (!formData.email || !formData.password) {
            setError("Please fill in all fields");
            setLoading(false);
            return;
        }

        try {
            const { data } = await API.post("/auth/login", formData);
            
            console.log("Login response:", data); // Debug log
            
            if (data.return_body.token) {
                const token = data.return_body.token;
                
                // Validate token format before storing
                if (!isValidJWTFormat(token)) {
                    setError("Invalid token format received");
                    setLoading(false);
                    return;
                }

                // Store token
                localStorage.setItem("token", token);
                
                // Store user info if provided
                if (data.return_body.user) {
                    localStorage.setItem("user", JSON.stringify(data.return_body.user));
                }
                
                // Calculate and store expiration time
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log("Decoded token payload:", payload); // Debug log
                    if (payload.exp) {
                        // Use token's expiration time
                        localStorage.setItem("tokenExpiration", (payload.exp * 1000).toString());
                    } else if (payload.expiresIn) {
                        // Use payload's expiresIn if exp is not available
                        const expirationTime = Date.now() + (payload.expiresIn * 1000);
                        localStorage.setItem("tokenExpiration", expirationTime.toString());
                    }
                } catch (decodeError) {
                    console.warn('Could not decode token for expiration:', decodeError);
                }
                
                navigate("/dashboard");
            } else {
                setError("Login successful but no token received");
            }
        } catch (err) {
            console.error("Login error:", err.response?.data || err.message); // Debug log
            const errorMessage = err.response?.data?.message || 
                               err.response?.data?.error || 
                               "Login failed. Please try again.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSignupClick = () => {
        navigate("/signup");
    };

    return (
        <>
      <Header />
      <div className="auth-container">
            <h2>Login</h2>
            {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
            <form onSubmit={handleSubmit}>
                <input 
                    name="email" 
                    type="email"
                    placeholder="Email" 
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    autoFocus
                />
                <input 
                    name="password" 
                    type="password" 
                    placeholder="Password" 
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    required 
                />
                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
            <p>Don't have an account?</p>
            <button type="button" onClick={handleSignupClick} disabled={loading} style={{ padding: "10px 20px", backgroundColor: "#4a90e2", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}>
                Sign Up
            </button>
        </div>
      <Footer />
    </>
    );
}

export default Login;

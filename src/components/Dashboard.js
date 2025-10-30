import React, { useEffect, useState, useCallback } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Dashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    console.log("user..:", user);
    // Memoize the getUsernameFromAuth function to prevent unnecessary re-renders
    const getUsernameFromAuth = useCallback(() => {
        // First, try to get from stored user data
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                if (userData.username) {
                    return userData.username;
                }
                if (userData.email) {
                    // Use email as fallback (remove @ and domain for username-like format)
                    return userData.email.split('@')[0];
                }
            } catch (e) {
                console.error("Error parsing stored user data:", e);
            }
        }

        // Second, try to extract from JWT token
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
                    // JWT 'sub' claim often contains username or user ID
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
                
                // Get username from auth data
                const username = getUsernameFromAuth();
                
                if (!username) {
                    throw new Error("No username found in authentication data");
                }

                console.log("Fetching user profile for username:", username); // Debug log
                const { data } = await API.get(`/users/${username}`);
                console.log("Profile data received:", data); // Debug log
                setUser(data);
                setError("");
            } catch (err) {
                console.error("Dashboard API error:", err); // Debug log
                console.error("Error response:", err.response?.data); // Debug log
                
                // Set error message instead of immediately redirecting
                const errorMessage = err.response?.data?.message || 
                                   err.response?.data?.error || 
                                   `API Error: ${err.response?.status} - ${err.message}`;
                setError(errorMessage);
                
                // Only redirect after a delay to allow user to see the error
                setTimeout(() => {
                    navigate("/login");
                }, 3000);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [getUsernameFromAuth, navigate]);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpiration");
        navigate("/login");
    };

    // Show loading state
    if (loading) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>Loading Dashboard...</h2>
                <p>Please wait while we fetch your profile.</p>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>Dashboard Error</h2>
                <p style={{ color: "red", marginBottom: "20px" }}>{error}</p>
                <p>Redirecting to login in 3 seconds...</p>
                <button onClick={() => navigate("/login")}>Go to Login Now</button>
            </div>
        );
    }

    // Show dashboard content
    return (
        <>
            <Header onLogout={logout} user={user} />
            <div style={{ padding: "20px" }}>
                <div style={{ marginBottom: "30px" }}>
                    <h2>Welcome, {user?.return_body?.username || user?.name || "User"}!</h2>
                </div>
                
                <div style={{ marginBottom: "20px" }}>
                    <p><strong>Email:</strong> {user?.return_body?.email || "Not available"}</p>
                </div>

                {/* User Details Section - Made collapsible */}
                <div style={{ marginTop: "30px" }}>
                    <details style={{ 
                        backgroundColor: "#f8f9fa", 
                        padding: "15px", 
                        borderRadius: "8px",
                        border: "1px solid #dee2e6"
                    }}>
                        <summary style={{ 
                            cursor: "pointer", 
                            fontWeight: "bold",
                            fontSize: "16px",
                            marginBottom: "10px",
                            color: "#495057"
                        }}>
                            View Full User Details
                        </summary>
                        <pre style={{ 
                            textAlign: "left", 
                            background: "#ffffff", 
                            padding: "15px", 
                            borderRadius: "5px",
                            border: "1px solid #e9ecef",
                            overflow: "auto",
                            fontSize: "12px",
                            lineHeight: "1.4"
                        }}>
                            {JSON.stringify(user.return_body, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
            
        </>
    );
}

export default Dashboard;

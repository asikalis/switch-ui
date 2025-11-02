import React, { useState } from "react";
import API from "../api/api";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

function Signup() {
    const [formData, setFormData] = useState({ 
        username: "", 
        email: "", 
        password: "", 
        roles: ["ROLE_USER"] // Default role
    });
    const navigate = useNavigate();

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.username || !formData.email || !formData.password || !formData.roles) {
            alert("Please fill in all fields");
            return;
        }
        
        console.log("Sending signup data:", formData); // Debug log
        
        try {
            const response = await API.post("/auth/signup", formData);
            console.log("Signup response:", response.data); // Debug log
            alert("Signup successful! Please login.");
            navigate("/login-success");
        } catch (err) {
            console.error("Signup error:", err.response?.data || err.message); // Debug log
            alert("Signup failed: " + (err.response?.data?.message || err.message));
        }
    };

    return (
        <>
        <div className="auth-container">
            <h2>Signup</h2>
            <form onSubmit={handleSubmit}>
                <input 
                    name="username" 
                    placeholder="Username" 
                    value={formData.username}
                    onChange={handleChange} 
                    required
                    autoFocus
                />
                <input 
                    name="email" 
                    type="email"
                    placeholder="Email" 
                    value={formData.email}
                    onChange={handleChange} 
                    required 
                />
                <input 
                    name="password" 
                    type="password" 
                    placeholder="Password" 
                    value={formData.password}
                    onChange={handleChange} 
                    required 
                />
                <button type="submit">Signup</button>
            </form>
        </div>
         <Footer />
         </>
    );
}

export default Signup;

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

function LoginSuccess() {
    const navigate = useNavigate();

    // Auto-redirect to login after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            navigate("/login");
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    const handleLoginNowClick = () => {
        navigate("/login");
    };

    return (
        <>
            <Header />
            <div className="auth-container">
                <h2 style={{ color: '#28a745' }}>🎉 Signup Successful!</h2>
                
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ 
                        backgroundColor: '#d4edda', 
                        border: '1px solid #c3e6cb', 
                        borderRadius: '8px', 
                        padding: '20px',
                        marginBottom: '20px',
                        color: '#155724'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>Welcome to Switch UI!</h3>
                        <p style={{ margin: '0', fontSize: '16px' }}>
                            Your account has been created successfully. You can now login with your credentials.
                        </p>
                    </div>
                    
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                        You will be automatically redirected to the login page in 5 seconds...
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button 
                        onClick={handleLoginNowClick}
                        style={{ 
                            padding: "12px 16px", 
                            backgroundColor: "#4a90e2", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "8px", 
                            cursor: "pointer", 
                            fontWeight: "600",
                            fontSize: "16px"
                        }}
                    >
                        Login Now
                    </button>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#999' }}>
                        Thank you for joining Switch UI! We're excited to have you on board.
                    </p>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default LoginSuccess;
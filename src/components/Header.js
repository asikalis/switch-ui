import React, { useState } from "react";
import { Link } from "react-router-dom";
import { usePasswordReset } from "../hooks/usePasswordReset";
import "./Header.css";

function Header({ onLogout, user }) {
  console.log("User data in Header:", user);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Use the reusable password reset hook
  const { openResetPasswordModal, ResetPasswordModal } = usePasswordReset();

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const closeProfileDropdown = () => {
    setShowProfileDropdown(false);
  };

  // Profile Icon Component
  const ProfileIcon = () => {
    if (!user) return null;
    
    const username = user?.return_body?.username || user?.name || "User";
    const email = user?.return_body?.email || "Not available";
    const initials = username.substring(0, 2).toUpperCase();

    return (
      <div className="profile-icon-container">
        <div 
          onClick={toggleProfileDropdown}
          className="profile-icon"
        >
          {initials}
        </div>

        {showProfileDropdown && (
          <>
            <div 
              className="profile-dropdown-overlay"
              onClick={closeProfileDropdown}
            />
            <div className="profile-dropdown">
              {/* Profile Header */}
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-user-info">
                  <div className="profile-dropdown-avatar">
                    {initials}
                  </div>
                  <div>
                    <h3 className="profile-dropdown-user-name">
                      {username}
                    </h3>
                    <p className="profile-dropdown-user-email">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="profile-dropdown-details">
                <h4>Profile Details</h4>
                <div className="profile-dropdown-details-content">
                  {user?.return_body ? (
                    Object.entries(user.return_body)
                      .filter(([key]) => !['enabled', 'roles'].includes(key)) // Add fields to ignore here
                      .map(([key, value]) => (
                        <div key={key} className="profile-detail-item">
                          <span className="profile-detail-key">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="profile-detail-colon">:</span>
                          <span className="profile-detail-value">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))
                  ) : (
                    <p className="profile-no-details">No additional details available</p>
                  )}
                </div>
                
                {/* Reset Password Button */}
                <div className="profile-dropdown-actions">
                  <button 
                    onClick={() => {
                      const username = user?.return_body?.username || user?.name;
                      if (username) {
                        openResetPasswordModal(username);
                        setShowProfileDropdown(false); // Close dropdown when opening modal
                      } else {
                        alert("Username not found!");
                      }
                    }}
                    className="reset-password-button"
                  >
                    🔑 Reset Password
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="header">
        <div><span>Switch UI</span></div>
        {onLogout && (
          <div className="header-actions">
            <ProfileIcon />
            <button 
              onClick={onLogout} 
              className="logout-button"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Reset Password Modal */}
      <ResetPasswordModal />
    </>
  );
}

export default Header;

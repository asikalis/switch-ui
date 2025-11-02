import { useState } from "react";
import { resetPassword } from "../api/api";

export const usePasswordReset = () => {
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");

  const openResetPasswordModal = (username) => {
    setTargetUsername(username);
    setShowResetPasswordModal(true);
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    setTargetUsername("");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    if (!targetUsername) {
      alert("Username not found!");
      return;
    }

    setResetPasswordLoading(true);
    
    try {
      await resetPassword(targetUsername, newPassword);
      alert(`Password reset successfully for user "${targetUsername}"!`);
      closeResetPasswordModal();
      return true;
    } catch (error) {
      console.error("Reset password error:", error);
      alert("Failed to reset password: " + (error.response?.data?.message || error.message));
      return false;
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const ResetPasswordModal = () => {
    if (!showResetPasswordModal) return null;

    const handleModalClick = (e) => {
      e.stopPropagation();
    };

    return (
      <div className="reset-password-modal-overlay" onClick={closeResetPasswordModal}>
        <div className="reset-password-modal" onClick={handleModalClick}>
          <h3 className="reset-password-modal-title">
            Reset Password for "{targetUsername}"
          </h3>
          <form onSubmit={handleResetPassword}>
            <div className="reset-password-form-group">
              <label className="reset-password-label">New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="reset-password-input"
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            <div className="reset-password-form-group">
              <label className="reset-password-label">Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="reset-password-input"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            <div className="reset-password-buttons">
              <button
                type="button"
                onClick={closeResetPasswordModal}
                className="reset-password-button cancel"
                disabled={resetPasswordLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="reset-password-button submit"
                disabled={resetPasswordLoading}
              >
                {resetPasswordLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return {
    openResetPasswordModal,
    closeResetPasswordModal,
    ResetPasswordModal,
    resetPasswordLoading
  };
};
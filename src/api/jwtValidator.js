import API from './api';

// JWT Token Validation Utilities
export class JWTValidator {
    
    // Method 1: Check if JWT token format is valid
    static isValidJWTFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            // Try to decode header and payload
            JSON.parse(atob(parts[0])); // Header
            JSON.parse(atob(parts[1])); // Payload
            return true;
        } catch (error) {
            console.error('Invalid JWT format:', error);
            return false;
        }
    }

    // Method 2: Check if token is expired (client-side)
    static isTokenExpired(token) {
        try {
            if (!this.isValidJWTFormat(token)) return true;
            
            // Decode JWT payload
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
            
            // Check expiration
            if (payload.exp && payload.exp < currentTime) {
                console.log('Token expired at:', new Date(payload.exp * 1000));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true; // Consider invalid tokens as expired
        }
    }

    // Method 3: Get token payload information
    static getTokenPayload(token) {
        try {
            if (!this.isValidJWTFormat(token)) return null;
            
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                userId: payload.sub || payload.user_id || payload.id,
                email: payload.email,
                roles: payload.roles,
                issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
                expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
                issuer: payload.iss,
                audience: payload.aud
            };
        } catch (error) {
            console.error('Error decoding token payload:', error);
            return null;
        }
    }

    // Method 4: Check stored token expiration
    static isStoredTokenExpired() {
        const expirationTime = localStorage.getItem("tokenExpiration");
        if (expirationTime) {
            return Date.now() > parseInt(expirationTime);
        }
        return false;
    }

    // Method 5: Server-side token verification (removed - using client-side validation only)
    static async verifyTokenWithServer(token = null) {
        // Removed server-side verification - using client-side token expiry check only
        const tokenToVerify = token || localStorage.getItem("token");
        
        if (!tokenToVerify) {
            return { isValid: false, error: 'No token provided' };
        }

        // Client-side validation only
        if (!this.isValidJWTFormat(tokenToVerify)) {
            return { 
                isValid: false, 
                error: 'Invalid token format',
                shouldClearToken: true
            };
        }

        if (this.isTokenExpired(tokenToVerify) || this.isStoredTokenExpired()) {
            return { 
                isValid: false, 
                error: 'Token is expired',
                shouldClearToken: true
            };
        }

        return { 
            isValid: true, 
            data: { message: 'Token is valid' },
            user: this.getTokenPayload(tokenToVerify)
        };
    }

    // Method 6: Complete token validation (client-side only)
    static async validateToken(token = null) {
        const tokenToValidate = token || localStorage.getItem("token");
        
        if (!tokenToValidate) {
            return { isValid: false, reason: 'No token found' };
        }

        // Step 1: Format validation
        if (!this.isValidJWTFormat(tokenToValidate)) {
            return { isValid: false, reason: 'Invalid token format' };
        }

        // Step 2: Client-side expiration check
        if (this.isTokenExpired(tokenToValidate) || this.isStoredTokenExpired()) {
            return { isValid: false, reason: 'Token expired', shouldClearToken: true };
        }

        // Client-side validation only
        const clientValidation = await this.verifyTokenWithServer(tokenToValidate);
        
        if (!clientValidation.isValid) {
            return { 
                isValid: false, 
                reason: clientValidation.error,
                shouldClearToken: clientValidation.shouldClearToken
            };
        }

        return { 
            isValid: true, 
            payload: this.getTokenPayload(tokenToValidate),
            user: clientValidation.user
        };
    }

    // Method 7: Clear authentication data
    static clearAuthData() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpiration");
        localStorage.removeItem("refreshToken"); // If you use refresh tokens
    }

    // Method 8: Store token with expiration
    static storeToken(token, expiresIn = null) {
        if (!this.isValidJWTFormat(token)) {
            throw new Error('Invalid token format');
        }

        localStorage.setItem("token", token);

        // Calculate and store expiration time
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            if (payload.exp) {
                // Use token's expiration time
                localStorage.setItem("tokenExpiration", (payload.exp * 1000).toString());
            } else if (expiresIn) {
                // Use provided expiration time (in seconds)
                const expirationTime = Date.now() + (expiresIn * 1000);
                localStorage.setItem("tokenExpiration", expirationTime.toString());
            }
        } catch (error) {
            console.warn('Could not decode token for expiration:', error);
        }
    }

    // Method 9: Get time until token expires
    static getTimeUntilExpiration(token = null) {
        try {
            const tokenToCheck = token || localStorage.getItem("token");
            if (!tokenToCheck) return null;

            const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
            if (!payload.exp) return null;

            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const timeUntilExpiration = expirationTime - Date.now();
            
            return timeUntilExpiration > 0 ? timeUntilExpiration : 0;
        } catch (error) {
            console.error('Error calculating time until expiration:', error);
            return null;
        }
    }

    // Method 10: Check if token expires soon (within specified minutes)
    static tokenExpiresSoon(token = null, withinMinutes = 5) {
        const timeUntilExpiration = this.getTimeUntilExpiration(token);
        if (timeUntilExpiration === null) return false;
        
        const minutesInMs = withinMinutes * 60 * 1000;
        return timeUntilExpiration <= minutesInMs;
    }
}

// Export default instance for convenience
export default JWTValidator;
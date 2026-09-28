// random otp generator 6 digits
export const generateOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate unique referral code (8 characters: alphanumeric)
export const generateReferralCode = (userId: string): string => {
    const timestamp = Date.now().toString(36) // Convert timestamp to base36
    const randomStr = Math.random().toString(36).substring(2, 6) // 4 random chars
    const userIdPart = userId.substring(userId.length - 4).toUpperCase() // Last 4 chars of userId
    return `${timestamp}${randomStr}${userIdPart}`.toUpperCase().substring(0, 10)
}

// Validate password strength
// Requirements: 8+ characters, 1 uppercase, 1 number, 1 special character
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
    // Minimum 8 characters
    if (password.length < 8) {
        return {
            isValid: false,
            error: 'Password must be at least 8 characters long'
        }
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            error: 'Password must contain at least one uppercase letter'
        }
    }

    // At least one number
    if (!/[0-9]/.test(password)) {
        return {
            isValid: false,
            error: 'Password must contain at least one number'
        }
    }

    // At least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return {
            isValid: false,
            error: 'Password must contain at least one special character'
        }
    }

    return { isValid: true }
}
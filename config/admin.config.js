export const ADMIN_CONFIG = {
    // Allowed admin emails (case-insensitive)
    ADMIN_EMAILS: [
        'sahin54481@gmail.com',
        'superadmin@uzumaki.com',
        'support@uzumaki.com',
        'hr@uzumaki.com'
    ],
    
    // Admin permissions
    PERMISSIONS: {
        VIEW_ALL_USERS: true,
        MANAGE_WITHDRAWALS: true,
        MANAGE_INVESTMENTS: true,
        VIEW_LOGS: true,
        MANAGE_SETTINGS: true
    },
    
    // System settings
    SYSTEM: {
        MIN_WITHDRAWAL: 130,
        MIN_DEPOSIT: 120,
        MAX_DEPOSIT: 50000,
        TDS_PERCENTAGE: 18,
        REFERRAL_LEVELS: 3,
        REFERRAL_PERCENTS: [16, 2, 1],
        AUTO_LOGOUT_MINUTES: 30
    },
    
    // Payment gateways
    PAYMENT: {
        PROVIDERS: ['Pay0', 'UPI', 'Bank Transfer'],
        DEFAULT_PROVIDER: 'Pay0',
        UPI_ID: 'uzumaki.invest@bank',
        SUPPORT_PHONE: '+91 9876543210',
        SUPPORT_EMAIL: 'support@uzumaki.com'
    }
};

// Check if email is admin
export function isAdminEmail(email) {
    return ADMIN_CONFIG.ADMIN_EMAILS.includes(email?.toLowerCase());
}

// Validate admin access
export function validateAdminAccess(email) {
    if (!email) return { isAdmin: false, reason: 'No email provided' };
    
    const isAdmin = isAdminEmail(email);
    return {
        isAdmin,
        permissions: isAdmin ? ADMIN_CONFIG.PERMISSIONS : null,
        access: isAdmin ? 'full' : 'denied'
    };
}

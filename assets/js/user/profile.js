// Profile Page JavaScript - Modern Professional Version
import { sessionManager, dbService, utils, supabase } from '../core/supabase.js';

// Global Variables
let currentUser = null;
let userProfile = null;
let isEditing = false;

// DOM Elements
const elements = {
    // User Info Elements
    profileUserName: document.getElementById('profileUserName'),
    profileUserEmail: document.getElementById('profileUserEmail'),
    profileAvatarImg: document.getElementById('profileAvatarImg'),
    userAvatarImg: document.getElementById('userAvatarImg'),
    userAvatarFallback: document.getElementById('userAvatarFallback'),
    mobileUserAvatarImg: document.getElementById('mobileUserAvatarImg'),
    mobileUserAvatarFallback: document.getElementById('mobileUserAvatarFallback'),
    
    // Form Elements
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    dateOfBirth: document.getElementById('dateOfBirth'),
    address: document.getElementById('address'),
    country: document.getElementById('country'),
    
    // Sidebar Elements
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    mobileUserName: document.getElementById('mobileUserName'),
    mobileUserEmail: document.getElementById('mobileUserEmail'),
    userTier: document.getElementById('userTier'),
    mobileUserTier: document.getElementById('mobileUserTier'),
    userVerified: document.getElementById('userVerified'),
    
    // Section Elements
    profileSections: document.querySelectorAll('.profile-section'),
    navItems: document.querySelectorAll('.profile-nav-item'),
    
    // Modal Elements
    changePasswordModal: document.getElementById('changePasswordModal'),
    avatarUploadModal: document.getElementById('avatarUploadModal'),
    
    // Button Elements
    editPersonalInfo: document.getElementById('editPersonalInfo'),
    savePersonalInfo: document.getElementById('savePersonalInfo'),
    avatarUploadBtn: document.getElementById('avatarUploadBtn'),
    changePasswordBtn: document.getElementById('changePasswordBtn'),
    logoutAllSessions: document.getElementById('logoutAllSessions'),
    saveAllChanges: document.getElementById('saveAllChanges'),
    exportProfile: document.getElementById('exportProfile'),
    
    // Security Elements
    enable2FA: document.getElementById('enable2FA'),
    enableBiometric: document.getElementById('enableBiometric'),
    viewLoginHistory: document.getElementById('viewLoginHistory'),
    
    // Activity Elements
    recentActivityList: document.getElementById('recentActivityList'),
    activeSessionsList: document.getElementById('activeSessionsList'),
    refreshActivity: document.getElementById('refreshActivity'),
    noActivity: document.getElementById('noActivity'),
    
    // Danger Zone Elements
    deactivateAccount: document.getElementById('deactivateAccount'),
    deleteAccount: document.getElementById('deleteAccount'),
    exportAllData: document.getElementById('exportAllData'),
    
    // Verification Elements
    verificationStatus: document.getElementById('verificationStatus'),
    verifyAccount: document.getElementById('verifyAccount'),
    
    // Stats Elements
    memberSince: document.getElementById('memberSince'),
    investmentRank: document.getElementById('investmentRank'),
    securityBadge: document.getElementById('securityBadge'),
    
    // Loading Overlay
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Initialize Profile Page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Profile] Initializing profile page...');
    
    try {
        // Show loading overlay
        showLoading();
        
        // Check authentication
        await checkAuth();
        
        // Initialize all components
        await initializeProfile();
        initializeEventListeners();
        initializeNavigation();
        initializeModals();
        
        // Hide loading overlay
        hideLoading();
        
        console.log('[Profile] Initialization complete');
        
        // Show welcome toast
        showToast('Profile loaded successfully', 'success');
        
    } catch (error) {
        console.error('[Profile] Initialization error:', error);
        showToast('Failed to load profile. Please refresh.', 'error');
        hideLoading();
    }
});

// Authentication Check
async function checkAuth() {
    try {
        const { user, profile } = await sessionManager.getCurrentUser();
        
        if (!user) {
            console.log('[Profile] No user found, redirecting to login');
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        currentUser = user;
        userProfile = profile;
        
    } catch (error) {
        console.error('[Profile] Auth check error:', error);
        window.location.href = '/pages/auth/login.html';
    }
}

// Initialize Profile Data
async function initializeProfile() {
    if (!currentUser) return;
    
    try {
        // Load user profile data
        const profileData = await dbService.getUserProfile(currentUser.id);
        
        if (profileData) {
            userProfile = profileData;
            updateProfileUI();
            updateSidebarUI();
            loadRecentActivity();
            loadActiveSessions();
            updateVerificationStatus();
            updateSecurityBadges();
            updateUserStats();
        }
        
    } catch (error) {
        console.error('[Profile] Profile data load error:', error);
        showToast('Failed to load profile data', 'error');
    }
}

// Update Profile UI
function updateProfileUI() {
    if (!userProfile) return;
    
    // Update form fields
    elements.firstName.value = userProfile.first_name || '';
    elements.lastName.value = userProfile.last_name || '';
    elements.email.value = currentUser.email || '';
    elements.phone.value = userProfile.phone || '';
    elements.dateOfBirth.value = userProfile.date_of_birth || '';
    elements.address.value = userProfile.address || '';
    elements.country.value = userProfile.country || '';
    
    // Update user info
    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || currentUser.email?.split('@')[0] || 'User';
    elements.profileUserName.textContent = fullName;
    
    // Update avatar
    updateAvatar(userProfile.avatar_url);
    
    // Update verification status
    updateVerificationStatus();
}

// Update Sidebar UI
function updateSidebarUI() {
    if (!userProfile || !currentUser) return;
    
    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || currentUser.email?.split('@')[0] || 'User';
    
    // Update desktop sidebar
    elements.sidebarUserName.textContent = fullName;
    elements.sidebarUserEmail.textContent = currentUser.email || '';
    elements.userTier.textContent = userProfile.account_tier || 'Standard';
    
    // Update mobile sidebar
    elements.mobileUserName.textContent = fullName;
    elements.mobileUserEmail.textContent = currentUser.email || '';
    elements.mobileUserTier.textContent = userProfile.account_tier || 'Standard';
    
    // Update verification badge
    if (userProfile.verified) {
        elements.userVerified.style.display = 'inline-block';
    } else {
        elements.userVerified.style.display = 'none';
    }
}

// Update Avatar
function updateAvatar(avatarUrl) {
    const avatarElements = [
        elements.profileAvatarImg,
        elements.userAvatarImg,
        elements.mobileUserAvatarImg
    ];
    
    const fallbackElements = [
        elements.userAvatarFallback,
        elements.mobileUserAvatarFallback
    ];
    
    if (avatarUrl) {
        avatarElements.forEach(img => {
            if (img) {
                img.src = avatarUrl;
                img.style.display = 'block';
            }
        });
        
        fallbackElements.forEach(fallback => {
            if (fallback) fallback.style.display = 'none';
        });
        
        // Set fallback text
        const initials = (userProfile.first_name?.[0] || 'U').toUpperCase();
        avatarElements.forEach(img => {
            if (img) img.alt = `Avatar of ${userProfile.first_name || 'User'}`;
        });
    } else {
        // Show fallback
        avatarElements.forEach(img => {
            if (img) img.style.display = 'none';
        });
        
        fallbackElements.forEach(fallback => {
            if (fallback) {
                fallback.style.display = 'flex';
                const initials = (userProfile.first_name?.[0] || userProfile.email?.[0] || 'U').toUpperCase();
                fallback.textContent = initials;
            }
        });
    }
}

// Update Verification Status
function updateVerificationStatus() {
    if (!userProfile) return;
    
    const verificationElement = elements.verificationStatus;
    const verifyButton = elements.verifyAccount;
    
    if (userProfile.verified) {
        verificationElement.classList.remove('unverified');
        verificationElement.querySelector('.verification-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
        verificationElement.querySelector('h4').textContent = 'Account Verified';
        verificationElement.querySelector('p').textContent = 'Your account is fully secured';
        verifyButton.innerHTML = '<i class="fas fa-check"></i>';
        verifyButton.disabled = true;
    } else {
        verificationElement.classList.add('unverified');
        verificationElement.querySelector('.verification-icon').innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        verificationElement.querySelector('h4').textContent = 'Account Not Verified';
        verificationElement.querySelector('p').textContent = 'Verify your account for full access';
        verifyButton.innerHTML = '<i class="fas fa-envelope"></i> Verify';
        verifyButton.disabled = false;
    }
}

// Update User Stats
function updateUserStats() {
    if (!userProfile) return;
    
    // Member since
    if (userProfile.created_at) {
        const joinDate = new Date(userProfile.created_at);
        elements.memberSince.textContent = joinDate.getFullYear().toString();
    }
    
    // Investment rank (mock data - would come from backend)
    const rank = Math.floor(Math.random() * 100) + 1;
    elements.investmentRank.textContent = `#${rank}`;
}

// Update Security Badges
function updateSecurityBadges() {
    // Update security badge count (mock data)
    const securityIssues = userProfile.verified ? 0 : 1;
    elements.securityBadge.textContent = securityIssues;
    
    if (securityIssues === 0) {
        elements.securityBadge.style.display = 'none';
    } else {
        elements.securityBadge.style.display = 'inline-block';
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activities = await dbService.getTransactions(currentUser.id, { limit: 10 });
        
        if (activities && activities.length > 0) {
            elements.noActivity.style.display = 'none';
            elements.recentActivityList.innerHTML = '';
            
            activities.forEach(activity => {
                const activityItem = createActivityItem(activity);
                elements.recentActivityList.appendChild(activityItem);
            });
        } else {
            elements.noActivity.style.display = 'block';
        }
    } catch (error) {
        console.error('[Profile] Error loading recent activity:', error);
        elements.noActivity.style.display = 'block';
    }
}

// Create Activity Item
function createActivityItem(activity) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    
    const iconClass = getActivityIcon(activity.type);
    const amountClass = activity.amount >= 0 ? 'positive' : 'negative';
    const amountPrefix = activity.amount >= 0 ? '+' : '-';
    
    div.innerHTML = `
        <div class="activity-icon ${iconClass.class}">
            <i class="${iconClass.icon}"></i>
        </div>
        <div class="activity-content">
            <div class="activity-title">${activity.description || activity.type}</div>
            <div class="activity-description">${activity.details || ''}</div>
            <div class="activity-meta">
                <span class="activity-time">${formatTimeAgo(activity.created_at)}</span>
                <span class="activity-amount ${amountClass}">
                    ${amountPrefix}₹${Math.abs(activity.amount).toLocaleString()}
                </span>
            </div>
        </div>
    `;
    
    return div;
}

// Get Activity Icon
function getActivityIcon(type) {
    const icons = {
        deposit: { class: 'deposit', icon: 'fas fa-arrow-down' },
        withdrawal: { class: 'withdrawal', icon: 'fas fa-arrow-up' },
        investment: { class: 'investment', icon: 'fas fa-chart-line' },
        earning: { class: 'earning', icon: 'fas fa-coins' },
        referral: { class: 'referral', icon: 'fas fa-user-friends' },
        signup: { class: 'signup', icon: 'fas fa-user-plus' },
        login: { class: 'login', icon: 'fas fa-sign-in-alt' },
        default: { class: 'default', icon: 'fas fa-circle' }
    };
    
    return icons[type] || icons.default;
}

// Load Active Sessions
async function loadActiveSessions() {
    try {
        // Mock data - in production, this would come from backend
        const sessions = [
            {
                device: 'Chrome on Windows',
                location: 'Mumbai, IN',
                ip: '192.168.1.1',
                last_active: new Date(Date.now() - 300000).toISOString(),
                current: true
            },
            {
                device: 'Safari on iPhone',
                location: 'Delhi, IN',
                ip: '192.168.1.2',
                last_active: new Date(Date.now() - 86400000).toISOString(),
                current: false
            }
        ];
        
        elements.activeSessionsList.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionItem = createSessionItem(session);
            elements.activeSessionsList.appendChild(sessionItem);
        });
    } catch (error) {
        console.error('[Profile] Error loading sessions:', error);
    }
}

// Create Session Item
function createSessionItem(session) {
    const div = document.createElement('div');
    div.className = 'activity-item';
    
    const isCurrent = session.current ? '<span class="badge badge-success" style="font-size: 0.7rem;">Current</span>' : '';
    const timeAgo = formatTimeAgo(session.last_active);
    
    div.innerHTML = `
        <div class="activity-icon">
            <i class="fas fa-desktop"></i>
        </div>
        <div class="activity-content">
            <div class="activity-title">
                ${session.device}
                ${isCurrent}
            </div>
            <div class="activity-description">
                ${session.location} • ${session.ip}
            </div>
            <div class="activity-meta">
                <span class="activity-time">Active ${timeAgo}</span>
                ${!session.current ? '<button class="btn btn-link btn-sm" style="padding: 0; font-size: 0.8rem;">Revoke</button>' : ''}
            </div>
        </div>
    `;
    
    return div;
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Form submission
    document.getElementById('personalInfoForm')?.addEventListener('submit', handleProfileUpdate);
    document.getElementById('changePasswordForm')?.addEventListener('submit', handlePasswordChange);
    
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
            
            // Update active state
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Buttons
    elements.editPersonalInfo?.addEventListener('click', toggleEditMode);
    elements.avatarUploadBtn?.addEventListener('click', openAvatarUpload);
    elements.changePasswordBtn?.addEventListener('click', openChangePassword);
    elements.logoutAllSessions?.addEventListener('click', logoutAllSessions);
    elements.saveAllChanges?.addEventListener('click', saveAllProfileChanges);
    elements.exportProfile?.addEventListener('click', exportProfileData);
    elements.refreshActivity?.addEventListener('click', loadRecentActivity);
    elements.verifyAccount?.addEventListener('click', verifyUserAccount);
    
    // Security toggles
    elements.enable2FA?.addEventListener('change', handle2FAToggle);
    elements.enableBiometric?.addEventListener('change', handleBiometricToggle);
    elements.viewLoginHistory?.addEventListener('click', viewLoginHistory);
    
    // Danger zone actions
    elements.deactivateAccount?.addEventListener('click', deactivateAccount);
    elements.deleteAccount?.addEventListener('click', deleteAccount);
    elements.exportAllData?.addEventListener('click', exportAllUserData);
    
    // Password validation
    document.getElementById('newPassword')?.addEventListener('input', validatePasswordStrength);
    document.getElementById('confirmNewPassword')?.addEventListener('input', checkPasswordMatch);
    
    // Avatar upload
    document.getElementById('avatarFileInput')?.addEventListener('change', handleAvatarFileSelect);
    document.querySelectorAll('input[name="avatarSource"]').forEach(radio => {
        radio.addEventListener('change', handleAvatarSourceChange);
    });
    document.getElementById('saveAvatar')?.addEventListener('click', saveAvatar);
    document.getElementById('avatarUrl')?.addEventListener('input', handleAvatarUrlInput);
    
    // Modal close buttons
    document.getElementById('closePasswordModal')?.addEventListener('click', () => closeModal('changePasswordModal'));
    document.getElementById('closeAvatarModal')?.addEventListener('click', () => closeModal('avatarUploadModal'));
    document.getElementById('cancelPasswordChange')?.addEventListener('click', () => closeModal('changePasswordModal'));
    document.getElementById('cancelAvatarUpload')?.addEventListener('click', () => closeModal('avatarUploadModal'));
}

// Initialize Navigation
function initializeNavigation() {
    // Set first section as active
    if (elements.profileSections.length > 0) {
        elements.profileSections[0].classList.add('active');
    }
    if (elements.navItems.length > 0) {
        elements.navItems[0].classList.add('active');
    }
}

// Initialize Modals
function initializeModals() {
    // Close modals when clicking outside
    document.querySelectorAll('.profile-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.profile-modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Switch Section
function switchSection(sectionId) {
    // Hide all sections
    elements.profileSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Smooth scroll to top of section
        targetSection.scrollIntoView({ behavior: 'sm

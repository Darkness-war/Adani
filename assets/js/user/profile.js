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
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Toggle Edit Mode
function toggleEditMode() {
    isEditing = !isEditing;
    
    const formInputs = document.querySelectorAll('#personalInfoForm .profile-form-input');
    
    formInputs.forEach(input => {
        if (input.id !== 'email') { // Don't enable email field
            input.disabled = !isEditing;
        }
    });
    
    elements.editPersonalInfo.innerHTML = isEditing ? 
        '<i class="fas fa-times"></i><span>Cancel</span>' : 
        '<i class="fas fa-edit"></i><span>Edit</span>';
    
    elements.editPersonalInfo.classList.toggle('btn-outline');
    elements.editPersonalInfo.classList.toggle('btn-danger');
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
        showLoading('Saving changes...');
        
        const updates = {
            first_name: elements.firstName.value.trim(),
            last_name: elements.lastName.value.trim(),
            phone: elements.phone.value.trim(),
            date_of_birth: elements.dateOfBirth.value,
            address: elements.address.value.trim(),
            country: elements.country.value,
            updated_at: new Date().toISOString()
        };
        
        // Remove empty values
        Object.keys(updates).forEach(key => {
            if (!updates[key]) delete updates[key];
        });
        
        const updatedProfile = await dbService.updateProfile(currentUser.id, updates);
        
        if (updatedProfile) {
            userProfile = { ...userProfile, ...updatedProfile };
            updateProfileUI();
            updateSidebarUI();
            
            showToast('Profile updated successfully', 'success');
            toggleEditMode(); // Exit edit mode
        }
        
    } catch (error) {
        console.error('[Profile] Update error:', error);
        showToast('Failed to update profile', 'error');
    } finally {
        hideLoading();
    }
}

// Open Change Password Modal
function openChangePassword() {
    elements.changePasswordModal.classList.add('active');
}

// Handle Password Change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        showLoading('Updating password...');
        
        // Update password with Supabase
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        // Clear form
        document.getElementById('changePasswordForm').reset();
        
        // Close modal
        closeModal('changePasswordModal');
        
        // Show success
        showToast('Password updated successfully', 'success');
        
        // Log activity
        await logSecurityActivity('password_change');
        
    } catch (error) {
        console.error('[Profile] Password change error:', error);
        showToast('Failed to update password', 'error');
    } finally {
        hideLoading();
    }
}

// Open Avatar Upload Modal
function openAvatarUpload() {
    elements.avatarUploadModal.classList.add('active');
}

// Handle Avatar Source Change
function handleAvatarSourceChange(e) {
    const source = e.target.value;
    const urlInput = document.querySelector('.url-input');
    
    if (source === 'url') {
        urlInput.style.display = 'block';
    } else {
        urlInput.style.display = 'none';
        
        if (source === 'camera') {
            // Access camera (would need permission)
            console.log('Camera access requested');
        } else if (source === 'gallery') {
            // Trigger file input
            document.getElementById('avatarFileInput').click();
        }
    }
}

// Handle Avatar File Select
function handleAvatarFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
    }
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('avatarPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Handle Avatar URL Input
function handleAvatarUrlInput(e) {
    const url = e.target.value;
    if (url) {
        document.getElementById('avatarPreview').src = url;
    }
}

// Save Avatar
async function saveAvatar() {
    try {
        showLoading('Uploading avatar...');
        
        // Get avatar source
        const source = document.querySelector('input[name="avatarSource"]:checked').value;
        let avatarUrl = '';
        
        if (source === 'url') {
            avatarUrl = document.getElementById('avatarUrl').value;
            
            // Validate URL
            if (!isValidUrl(avatarUrl)) {
                throw new Error('Invalid URL');
            }
        } else if (source === 'gallery' || source === 'camera') {
            // In production, upload to Supabase Storage
            // For now, we'll use a mock URL
            avatarUrl = `https://ui-avatars.com/api/?name=${userProfile.first_name}+${userProfile.last_name}&background=4361ee&color=fff`;
        }
        
        // Update profile with new avatar
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        // Update UI
        userProfile.avatar_url = avatarUrl;
        updateAvatar(avatarUrl);
        
        // Close modal
        closeModal('avatarUploadModal');
        
        // Show success
        showToast('Profile picture updated', 'success');
        
    } catch (error) {
        console.error('[Profile] Avatar upload error:', error);
        showToast('Failed to update profile picture', 'error');
    } finally {
        hideLoading();
    }
}

// Validate Password Strength
function validatePasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (!password) {
        strengthBars.forEach(bar => bar.style.background = 'var(--gray-200)');
        strengthText.textContent = 'Password strength';
        strengthText.style.color = 'var(--gray-600)';
        return;
    }
    
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const validCount = Object.values(requirements).filter(Boolean).length;
    
    // Update bars
    strengthBars.forEach((bar, index) => {
        if (index < validCount) {
            const colors = ['var(--danger)', 'var(--warning)', 'var(--warning)', 'var(--primary)', 'var(--success)'];
            bar.style.background = colors[validCount - 1] || 'var(--danger)';
        } else {
            bar.style.background = 'var(--gray-200)';
        }
    });
    
    // Update text
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--danger)', 'var(--warning)', 'var(--warning)', 'var(--primary)', 'var(--success)'];
    
    strengthText.textContent = strengthLevels[validCount - 1] || 'Very Weak';
    strengthText.style.color = colors[validCount - 1] || 'var(--danger)';
}

// Check Password Match
function checkPasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const helper = document.getElementById('passwordMatchHelper');
    
    if (!confirmPassword) {
        helper.textContent = '';
        return;
    }
    
    if (password === confirmPassword) {
        helper.textContent = 'Passwords match';
        helper.className = 'form-helper';
        helper.style.color = 'var(--success)';
    } else {
        helper.textContent = 'Passwords do not match';
        helper.className = 'form-helper error';
        helper.style.color = 'var(--danger)';
    }
}

// Handle 2FA Toggle
async function handle2FAToggle(e) {
    const enabled = e.target.checked;
    
    try {
        showLoading(enabled ? 'Enabling 2FA...' : 'Disabling 2FA...');
        
        // In production, this would call a backend API
        // For now, we'll just show a success message
        
        setTimeout(() => {
            hideLoading();
            showToast(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, 'success');
            
            // Log activity
            logSecurityActivity(enabled ? '2fa_enabled' : '2fa_disabled');
        }, 1000);
        
    } catch (error) {
        console.error('[Profile] 2FA toggle error:', error);
        showToast('Failed to update 2FA settings', 'error');
        e.target.checked = !enabled; // Revert toggle
    }
}

// Handle Biometric Toggle
async function handleBiometricToggle(e) {
    const enabled = e.target.checked;
    
    // Check if browser supports biometrics
    if (enabled && !('credentials' in navigator)) {
        showToast('Biometric login not supported on this device', 'warning');
        e.target.checked = false;
        return;
    }
    
    try {
        showLoading(enabled ? 'Enabling biometric login...' : 'Disabling biometric login...');
        
        // In production, this would call a backend API
        
        setTimeout(() => {
            hideLoading();
            showToast(`Biometric login ${enabled ? 'enabled' : 'disabled'}`, 'success');
            
            // Log activity
            logSecurityActivity(enabled ? 'biometric_enabled' : 'biometric_disabled');
        }, 1000);
        
    } catch (error) {
        console.error('[Profile] Biometric toggle error:', error);
        showToast('Failed to update biometric settings', 'error');
        e.target.checked = !enabled;
    }
}

// View Login History
function viewLoginHistory() {
    // Switch to activity section and show login history
    switchSection('activity');
    
    // In production, this would filter activity to show only logins
    showToast('Showing login history', 'info');
}

// Logout All Sessions
async function logoutAllSessions() {
    if (!confirm('Are you sure you want to log out from all devices? You will need to log in again.')) {
        return;
    }
    
    try {
        showLoading('Logging out from all sessions...');
        
        // Sign out from all sessions
        await sessionManager.logout();
        
        // Redirect to login page
        window.location.href = '/pages/auth/login.html?logout=all';
        
    } catch (error) {
        console.error('[Profile] Logout all error:', error);
        showToast('Failed to log out from all sessions', 'error');
        hideLoading();
    }
}

// Save All Profile Changes
async function saveAllProfileChanges() {
    try {
        showLoading('Saving all changes...');
        
        // Collect all form data
        const updates = {
            first_name: elements.firstName.value.trim(),
            last_name: elements.lastName.value.trim(),
            phone: elements.phone.value.trim(),
            date_of_birth: elements.dateOfBirth.value,
            address: elements.address.value.trim(),
            country: elements.country.value,
            updated_at: new Date().toISOString()
        };
        
        // Update profile
        const updatedProfile = await dbService.updateProfile(currentUser.id, updates);
        
        if (updatedProfile) {
            userProfile = { ...userProfile, ...updatedProfile };
            updateProfileUI();
            updateSidebarUI();
            
            showToast('All changes saved successfully', 'success');
        }
        
    } catch (error) {
        console.error('[Profile] Save all error:', error);
        showToast('Failed to save changes', 'error');
    } finally {
        hideLoading();
    }
}

// Export Profile Data
async function exportProfileData() {
    try {
        showLoading('Preparing data export...');
        
        // Collect user data
        const exportData = {
            user: {
                email: currentUser.email,
                created_at: currentUser.created_at
            },
            profile: userProfile,
            timestamp: new Date().toISOString(),
            export_id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Create downloadable JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `uzumaki_profile_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        showToast('Profile data exported successfully', 'success');
        
        // Log activity
        await logSecurityActivity('data_export');
        
    } catch (error) {
        console.error('[Profile] Export error:', error);
        showToast('Failed to export data', 'error');
    } finally {
        hideLoading();
    }
}

// Verify User Account
async function verifyUserAccount() {
    try {
        showLoading('Sending verification email...');
        
        // Send verification email
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: currentUser.email
        });
        
        if (error) throw error;
        
        showToast('Verification email sent. Please check your inbox.', 'success');
        
    } catch (error) {
        console.error('[Profile] Verification error:', error);
        showToast('Failed to send verification email', 'error');
    } finally {
        hideLoading();
    }
}

// Deactivate Account
async function deactivateAccount() {
    if (!confirm('Are you sure you want to deactivate your account? Your data will be preserved for 30 days.')) {
        return;
    }
    
    try {
        showLoading('Deactivating account...');
        
        // In production, this would call a backend API
        // For now, we'll simulate the process
        
        setTimeout(() => {
            hideLoading();
            showToast('Account deactivation request submitted', 'success');
            showToast('You will be logged out in 5 seconds...', 'warning');
            
            // Log out after delay
            setTimeout(() => {
                sessionManager.logout();
            }, 5000);
        }, 2000);
        
    } catch (error) {
        console.error('[Profile] Deactivation error:', error);
        showToast('Failed to deactivate account', 'error');
    }
}

// Delete Account
async function deleteAccount() {
    if (!confirm('WARNING: This will permanently delete your account and all associated data. This action cannot be undone. Are you absolutely sure?')) {
        return;
    }
    
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
        showToast('Account deletion cancelled', 'info');
        return;
    }
    
    try {
        showLoading('Deleting account...');
        
        // In production, this would call a backend API
        // For now, we'll simulate the process
        
        setTimeout(() => {
            hideLoading();
            showToast('Account deletion in progress...', 'warning');
            showToast('You will be logged out shortly', 'info');
            
            // Log out after delay
            setTimeout(() => {
                sessionManager.logout();
            }, 3000);
        }, 2000);
        
    } catch (error) {
        console.error('[Profile] Delete account error:', error);
        showToast('Failed to delete account', 'error');
    }
}

// Export All User Data
async function exportAllUserData() {
    try {
        showLoading('Preparing complete data export...');
        
        // In production, this would fetch all user data from backend
        const allData = {
            profile: userProfile,
            investments: [],
            transactions: [],
            referrals: [],
            settings: {},
            export_metadata: {
                timestamp: new Date().toISOString(),
                export_id: `full_export_${Date.now()}`,
                data_types: ['profile', 'investments', 'transactions', 'referrals']
            }
        };
        
        // Create downloadable file
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `uzumaki_complete_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        showToast('Complete data export downloaded', 'success');
        
        // Log activity
        await logSecurityActivity('full_data_export');
        
    } catch (error) {
        console.error('[Profile] Full export error:', error);
        showToast('Failed to export complete data', 'error');
    } finally {
        hideLoading();
    }
}

// Log Security Activity
async function logSecurityActivity(action) {
    try {
        await dbService.createTransaction({
            user_id: currentUser.id,
            type: 'security',
            action: action,
            status: 'completed',
            details: `User performed security action: ${action}`,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Profile] Activity log error:', error);
    }
}

// Utility Functions
function showLoading(message = 'Loading...') {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove('hidden');
        const loadingText = elements.loadingOverlay.querySelector('.loading-text');
        if (loadingText && message) {
            loadingText.textContent = message;
        }
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    // Use utils.showToast if available
    if (window.utils && typeof window.utils.showToast === 'function') {
        window.utils.showToast(message, type);
        return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : 
                     type === 'error' ? '#ef4444' : 
                     type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: toastSlideIn 0.3s ease;
        font-weight: 500;
        max-width: 350px;
    `;
    
    const icon = type === 'success' ? 'fas fa-check-circle' :
                 type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="${icon}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Initialize sidebar functionality (from dashboard)
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Initialize sidebar collapse
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const desktopSidebar = document.querySelector('.desktop-sidebar');
        
        if (sidebarCollapse && desktopSidebar) {
            sidebarCollapse.addEventListener('click', () => {
                desktopSidebar.classList.toggle('collapsed');
            });
        }
        
        // Initialize mobile menu
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileSidebar = document.getElementById('mobileSidebar');
        const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
        const closeMobileSidebar = document.getElementById('closeMobileSidebar');
        
        if (mobileMenuToggle && mobileSidebar) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileSidebar.classList.add('active');
                mobileSidebarOverlay.classList.add('active');
            });
            
            closeMobileSidebar?.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
            
            mobileSidebarOverlay?.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
        }
        
        // Initialize logout buttons
        const logoutButtons = [
            document.getElementById('sidebarLogout'),
            document.getElementById('mobileLogoutBtn')
        ];
        
        logoutButtons.forEach(btn => {
            btn?.addEventListener('click', async () => {
                if (confirm('Are you sure you want to log out?')) {
                    try {
                        showLoading('Logging out...');
                        await sessionManager.logout();
                    } catch (error) {
                        console.error('Logout error:', error);
                        hideLoading();
                    }
                }
            });
        });
    });
}

console.log('[Profile] profile.js loaded successfully');

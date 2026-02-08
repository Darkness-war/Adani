// assets/js/admin/settings.js

function applySettingsToForm() {
    const settings = window.adminData?.settings || {};
    
    // General settings
    document.getElementById('websiteName').value = settings.website_name || 'Uzumaki Investments';
    document.getElementById('websiteTagline').value = settings.website_tagline || 'Smart Investment Platform';
    document.getElementById('adminEmail').value = settings.admin_email || 'admin@uzumaki.in';
    document.getElementById('supportEmail').value = settings.support_email || 'support@uzumaki.in';
    document.getElementById('contactPhone').value = settings.contact_phone || '+1 (555) 123-4567';
    document.getElementById('contactAddress').value = settings.contact_address || '';
    document.getElementById('timezone').value = settings.timezone || 'Asia/Kolkata';
    document.getElementById('currency').value = settings.currency || 'INR';
    
    // Appearance settings
    document.getElementById('primaryColor').value = settings.primary_color || '#667eea';
    document.getElementById('secondaryColor').value = settings.secondary_color || '#764ba2';
    document.getElementById('themeMode').value = settings.theme_mode || 'light';
    document.getElementById('customCSS').value = settings.custom_css || '';
    
    // Maintenance settings
    document.getElementById('maintenanceMode').checked = settings.maintenance_mode === 'true';
    document.getElementById('maintenanceMessage').value = settings.maintenance_message || 
        "We're performing scheduled maintenance to improve your experience. We'll be back shortly!";
    document.getElementById('maintenanceEndTime').value = settings.maintenance_end_time || '';
    document.getElementById('allowedIPs').value = settings.allowed_ips || '';
}

function getSettingsFromForm() {
    return {
        website_name: document.getElementById('websiteName').value,
        website_tagline: document.getElementById('websiteTagline').value,
        admin_email: document.getElementById('adminEmail').value,
        support_email: document.getElementById('supportEmail').value,
        contact_phone: document.getElementById('contactPhone').value,
        contact_address: document.getElementById('contactAddress').value,
        timezone: document.getElementById('timezone').value,
        currency: document.getElementById('currency').value,
        primary_color: document.getElementById('primaryColor').value,
        secondary_color: document.getElementById('secondaryColor').value,
        theme_mode: document.getElementById('themeMode').value,
        custom_css: document.getElementById('customCSS').value,
        maintenance_mode: document.getElementById('maintenanceMode').checked.toString(),
        maintenance_message: document.getElementById('maintenanceMessage').value,
        maintenance_end_time: document.getElementById('maintenanceEndTime').value,
        allowed_ips: document.getElementById('allowedIPs').value
    };
}

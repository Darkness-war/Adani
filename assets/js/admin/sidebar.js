// assets/js/admin/sidebar.js

document.addEventListener('DOMContentLoaded', () => {
    // Handle sidebar collapse on mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const adminSidebar = document.getElementById('adminSidebar');
    
    sidebarToggle.addEventListener('click', () => {
        adminSidebar.classList.toggle('collapsed');
    });
    
    // Handle nav group toggles
    document.querySelectorAll('.nav-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
            if (!e.target.closest('.admin-sidebar') && !e.target.closest('.sidebar-toggle')) {
                adminSidebar.classList.remove('show');
            }
        }
    });
});

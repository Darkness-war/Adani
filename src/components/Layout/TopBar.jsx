import { useEffect } from 'react';

function TopBar({ title, showBackButton = false }) {
  useEffect(() => {
    // Setup hamburger menu click
    const menuBtn = document.querySelector('.menu-btn');
    const sideMenu = document.getElementById('sideMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        if (sideMenu) sideMenu.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.classList.add('sidebar-open');
      });
    }
    
    // Setup close button
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (sideMenu) sideMenu.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
      });
    }
    
    // Setup overlay click
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sideMenu.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
      });
    }
  }, []);
  
  return (
    <header className="top-bar">
      {showBackButton ? (
        <a href="javascript:history.back()" className="header-back-btn">
          <i className="fas fa-arrow-left"></i>
        </a>
      ) : (
        <div className="menu-btn">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      {title}
    </header>
  );
}

export default TopBar;

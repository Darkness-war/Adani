import { useEffect } from 'react';

function TopBar({ title }) {
  useEffect(() => {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sideMenu = document.getElementById('sideMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sideMenu?.classList.add('open');
        sidebarOverlay?.classList.add('active');
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sideMenu?.classList.remove('open');
        sidebarOverlay?.classList.remove('active');
      });
    }
    
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sideMenu?.classList.remove('open');
        sidebarOverlay?.classList.remove('active');
      });
    }
  }, []);
  
  return (
    <header className="top-bar">
      <div id="menuBtn" className="menu-btn">
        <span></span>
        <span></span>
        <span></span>
      </div>
      {title}
    </header>
  );
}

export default TopBar;

import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

function Sidebar() {
  useEffect(() => {
    loadUserDetails();
    setupEventListeners();
    
    async function loadUserDetails() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, vip_level')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          document.getElementById('sidebarId').textContent = `ID: ${user.id.slice(0, 8)}`;
          document.getElementById('sidebarVIP').textContent = profile.vip_level ? `VIP ${profile.vip_level}` : 'Standard';
        }
      }
    }
    
    function setupEventListeners() {
      // Settings toggle
      const settingsToggle = document.getElementById('settingsToggleBtn');
      const settingsSubmenu = document.getElementById('settingsSubmenu');
      
      if (settingsToggle && settingsSubmenu) {
        settingsToggle.addEventListener('click', () => {
          settingsSubmenu.classList.toggle('show');
          const chevron = settingsToggle.querySelector('.chevron');
          if (chevron) {
            chevron.textContent = settingsSubmenu.classList.contains('show') ? '⌄' : '›';
          }
        });
      }
      
      // Close sidebar when clicking on a link
      document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('sideMenu').classList.remove('open');
          document.getElementById('sidebarOverlay').classList.remove('active');
        });
      });
    }
  }, []);
  
  return (
    <aside id="sideMenu" className="side-menu">
      <div className="sidebar-header">
        <div id="sidebarId">Loading...</div>
        <div id="sidebarVIP">...</div>
      </div>
      <div className="sidebar-actions">
        <a href="/contact" className="sidebar-btn">
          <span>🧑‍💼</span> Customer Support
        </a>
        <a href="https://t.me/uzumaki_channel" target="_blank" rel="noopener noreferrer" className="sidebar-btn">
          <span>💬</span> Telegram Channel
        </a>
        
        <button className="sidebar-btn" id="settingsToggleBtn">
          <div className="sidebar-btn-content">
            <span>⚙️</span> Settings
          </div>
          <span className="chevron">›</span>
        </button>
        
        <div className="settings-submenu" id="settingsSubmenu">
          <a href="/terms" className="sidebar-btn sub-item">
            <span>📄</span> Terms & Conditions
          </a>
          <a href="/privacy-policy" className="sidebar-btn sub-item">
            <span>🔒</span> Privacy Policy
          </a>
          <a href="/refund" className="sidebar-btn sub-item">
            <span>💳</span> Refund Policy
          </a>
        </div>
      </div>
      <span id="closeBtn" className="close-btn">&times;</span>
    </aside>
  );
}

export default Sidebar;

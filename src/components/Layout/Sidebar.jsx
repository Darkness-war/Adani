[file name]: Sidebar.jsx
[file content begin]
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function Sidebar({ isOpen = false, close }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserDetails();
    setupEventListeners();
    
    async function loadUserDetails() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, vip_level, name, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setProfile(profile);
          // Update sidebar display
          const sidebarId = document.getElementById('sidebarId');
          const sidebarVIP = document.getElementById('sidebarVIP');
          const sidebarBalance = document.getElementById('sidebarBalance');
          
          if (sidebarId) sidebarId.textContent = `ID: ${user.id.slice(0, 8)}`;
          if (sidebarVIP) sidebarVIP.textContent = profile.vip_level ? `VIP ${profile.vip_level}` : 'Standard';
          if (sidebarBalance) sidebarBalance.textContent = `₹${profile.balance?.toFixed(2) || '0.00'}`;
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
          const sideMenu = document.getElementById('sideMenu');
          const sidebarOverlay = document.getElementById('sidebarOverlay');
          
          if (sideMenu) sideMenu.classList.remove('open');
          if (sidebarOverlay) sidebarOverlay.classList.remove('active');
          document.body.classList.remove('sidebar-open');
          
          // Call close prop if available
          if (close) close();
        });
      });
      
      // Close button
      const closeBtn = document.getElementById('closeBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          const sideMenu = document.getElementById('sideMenu');
          const sidebarOverlay = document.getElementById('sidebarOverlay');
          
          if (sideMenu) sideMenu.classList.remove('open');
          if (sidebarOverlay) sidebarOverlay.classList.remove('active');
          document.body.classList.remove('sidebar-open');
          
          if (close) close();
        });
      }
    }
  }, [close]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  
  return (
    <>
      <div 
        id="sidebarOverlay" 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={close}
      ></div>
      
      <aside id="sideMenu" className={`side-menu ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-details">
              <div id="sidebarId" className="sidebar-id">ID: Loading...</div>
              <div id="sidebarVIP" className="sidebar-vip">Standard</div>
            </div>
          </div>
          <div className="sidebar-balance">
            <div className="sidebar-balance-label">Balance</div>
            <div id="sidebarBalance" className="sidebar-balance-amount">₹0.00</div>
          </div>
        </div>
        
        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={() => navigate('/control-panel')}>
            <span>📊</span> Control Panel
          </button>
          
          <button className="sidebar-btn" onClick={() => navigate('/transactions')}>
            <span>📜</span> Transaction History
          </button>
          
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
          
          <button className="sidebar-btn logout-btn" onClick={handleLogout}>
            <span>🚪</span> Log Out
          </button>
        </div>
        
        <span id="closeBtn" className="close-btn">&times;</span>
      </aside>
    </>
  );
}

export default Sidebar;
[file content end]

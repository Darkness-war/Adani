import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

function SystemControl() {
  useEffect(() => {
    // System administrators (store in environment variables or database)
    const SYSTEM_ADMINS = [
      'admin@uzumaki.com',
      'sahin54481@gmail.com'
    ];

    // Get admin emails from localStorage or environment
    const adminEmails = JSON.parse(localStorage.getItem('admin_emails')) || SYSTEM_ADMINS;

    const form = document.getElementById('systemLoginForm');
    const togglePassword = document.getElementById('toggleSystemPassword');
    
    if (!form || !togglePassword) return;

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('systemEmail').value.toLowerCase();
      const password = document.getElementById('systemPassword').value;
      
      // First check if email is in admin list
      if (!adminEmails.includes(email)) {
        alert('Access Denied: Invalid access credentials.');
        return;
      }

      try {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Double-check admin status after successful login
        if (adminEmails.includes(data.user.email.toLowerCase())) {
          // Store admin session
          localStorage.setItem('admin_session', 'true');
          localStorage.setItem('admin_user', JSON.stringify(data.user));
          
          // Redirect to control panel
          window.location.href = '/control-panel';
        } else {
          alert('Access denied: Not an authorized administrator.');
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('Access denied: ' + error.message);
      }
    };

    const handleTogglePassword = () => {
      const passwordInput = document.getElementById('systemPassword');
      if (!passwordInput) return;
      
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      const toggleIcon = document.getElementById('toggleSystemPassword');
      if (toggleIcon) {
        toggleIcon.textContent = type === 'password' ? '👁️' : '🔒';
      }
    };

    // Attach event listeners
    form.addEventListener('submit', handleSubmit);
    togglePassword.addEventListener('click', handleTogglePassword);

    // Cleanup
    return () => {
      form.removeEventListener('submit', handleSubmit);
      togglePassword.removeEventListener('click', handleTogglePassword);
    };
  }, []);

  return (
    <div className="auth-page-background">
      <main className="auth-container">
        <div className="auth-card">
          <h2>System Control</h2>
          <div className="security-notice">
            Authorized Personnel Only
          </div>
          <form id="systemLoginForm">
            <div className="input-group">
              <label htmlFor="systemEmail">Access ID</label>
              <input 
                type="email" 
                id="systemEmail" 
                name="systemEmail" 
                placeholder="Enter access ID" 
                required 
                autoComplete="username"
              />
            </div>
            <div className="input-group">
              <label htmlFor="systemPassword">Security Key</label>
              <div className="password-wrapper">
                <input 
                  type="password" 
                  id="systemPassword" 
                  name="systemPassword" 
                  placeholder="Enter security key" 
                  required 
                  autoComplete="current-password"
                />
                <span id="toggleSystemPassword" className="password-toggle-icon">👁️</span>
              </div>
            </div>
            <button type="submit" className="submit-btn">Access System</button>
          </form>
        </div>
      </main>
      
      <style jsx>{`
        .auth-page-background {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .auth-container {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .auth-card {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .auth-card h2 {
          margin: 0 0 20px 0;
          text-align: center;
          color: #1a237e;
        }
        
        .security-notice {
          text-align: center;
          font-size: 0.9em;
          color: #666;
          margin-bottom: 25px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 5px;
          border-left: 4px solid #1a237e;
        }
        
        .input-group {
          margin-bottom: 20px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }
        
        .input-group input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
          transition: border 0.3s;
        }
        
        .input-group input:focus {
          outline: none;
          border-color: #1a237e;
          box-shadow: 0 0 0 2px rgba(26, 35, 126, 0.1);
        }
        
        .password-wrapper {
          position: relative;
        }
        
        .password-toggle-icon {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          user-select: none;
          color: #666;
        }
        
        .submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 10px;
        }
        
        .submit-btn:hover {
          background: linear-gradient(135deg, #283593 0%, #1a237e 100%);
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(26, 35, 126, 0.2);
        }
        
        .submit-btn:active {
          transform: translateY(0);
        }
        
        @media (max-width: 480px) {
          .auth-card {
            padding: 20px;
          }
          
          .auth-container {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}

export default SystemControl;

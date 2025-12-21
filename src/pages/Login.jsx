import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

function Login() {
  useEffect(() => {
    // Copy original auth.js logic
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const loginId = document.getElementById('loginId').value;
      const password = document.getElementById('password').value;
      
      // Determine if loginId is email or phone
      const isEmail = loginId.includes('@');
      
      try {
        let user;
        
        if (isEmail) {
          // Email login
          const { data, error } = await supabase.auth.signInWithPassword({
            email: loginId,
            password: password
          });
          
          if (error) throw error;
          user = data.user;
        } else {
          // Phone login - need to check profiles for phone
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('phone', loginId)
            .single();
            
          if (!profile) throw new Error('Phone not found');
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: password
          });
          
          if (error) throw error;
          user = data.user;
        }
        
        // Store user ID in localStorage for backward compatibility
        localStorage.setItem('uid', user.id);
        
        // Redirect to home
        window.location.href = '/';
        
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    });
    
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
      togglePassword.addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁️' : '🔒';
      });
    }
    
    // Forgot password
    document.getElementById('forgotPasswordLink')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter your email address:');
      if (email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
          alert('Error: ' + error.message);
        } else {
          alert('Password reset link sent to your email');
        }
      }
    });
  }, []);
  
  return (
    <div className="auth-page-background">
      <div className="auth-container-wrapper">
        <div className="auth-header">
          <div className="company-name">Uzumaki</div>
          <p className="welcome-text">Welcome back to your journey!</p>
          <a href="/register" className="header-link">Create Account</a>
        </div>
        
        <div className="auth-content">
          <h2>Login</h2>
          <form id="loginForm">
            <div className="input-group">
              <div className="password-wrapper">
                <input type="text" id="loginId" name="loginId" placeholder="email or phone" required />
              </div>
            </div>
            
            <div className="input-group">
              <div className="password-wrapper">
                <input type="password" id="password" name="password" placeholder="Password" required />
                <span id="togglePassword" className="password-toggle-icon">👁️</span>
              </div>
            </div>
            
            <button type="submit" className="submit-btn">Login</button>
            
            <div className="divider"></div>
            
            <div className="social-login">
              <div className="social-icons">
                <a href="#" className="social-icon">📞</a>
                <a href="#" className="social-icon">🖥️</a>
                <a href="#" className="social-icon">👩🏻‍🎤</a>
              </div>
            </div>
            
            <div className="auth-footer-link">
              Don't have an account? <a href="/register">Register</a>
            </div>
            
            <div className="auth-footer-link" style={{ marginTop: '10px' }}>
              <a href="#" id="forgotPasswordLink">Forgot Password?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;

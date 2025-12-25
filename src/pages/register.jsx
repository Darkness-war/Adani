import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

function Register() {
  useEffect(() => {
    document.getElementById('registerBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value;
      const phone = document.getElementById('phone').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const referralCode = document.getElementById('referralCode').value;
      
      // Validation
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      
      if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      
      try {
        // Check if referral code exists
        let referredBy = null;
        if (referralCode) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();
          
          if (referrer) {
            referredBy = referrer.id;
          } else {
            alert('Invalid referral code');
            return;
          }
        }
        
        // Generate unique referral code for new user
        const userReferralCode = 'UZ' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Register user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              phone,
              referral_code: userReferralCode,
              referred_by: referredBy
            }
          }
        });
        
        if (authError) throw authError;
        
        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            name,
            phone,
            referral_code: userReferralCode,
            referred_by: referredBy,
            balance: 0,
            vip_level: 0
          });
        
        if (profileError) {
          // If profile creation fails, delete the auth user
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }
        
        alert('Registration successful! Please verify your email.');
        window.location.href = '/verify-email';
        
      } catch (error) {
        alert('Registration failed: ' + error.message);
      }
    });
  }, []);
  
  return (
    <body className="auth-page-background">
      <div className="auth-container-wrapper">
        <div className="auth-header">
          <div className="company-name">Uzumaki</div>
          <p className="welcome-text">Start your journey today!</p>
          <a href="/login" className="header-link">Login Instead</a>
        </div>
        
        <div className="auth-content">
          <h2>Create Account</h2>
          <form id="registerForm">
            <div className="input-group">
              <div className="password-wrapper">
                <input type="text" id="name" placeholder="Full Name" required />
              </div>
            </div>
            
            <div className="input-group">
              <div className="password-wrapper">
                <input type="tel" id="phone" placeholder="Phone Number" required />
              </div>
            </div>
            
            <div className="input-group">
              <div className="password-wrapper">
                <input type="email" id="email" placeholder="Email" required />
              </div>
            </div>
            
            <div className="input-group">
              <div className="password-wrapper">
                <input type="password" id="password" placeholder="Password" required />
              </div>
            </div>
            
            <div className="input-group">
              <div className="password-wrapper">
                <input type="password" id="confirmPassword" placeholder="Confirm Password" required />
              </div>
            </div>
            
            <div className="input-group">
              <div className="password-wrapper">
                <input type="text" id="referralCode" placeholder="Referral Code (Optional)" />
              </div>
            </div>
            
            <button type="button" id="registerBtn" className="submit-btn">
              Register
            </button>
            
            <div className="auth-footer-link">
              Already have an account? <a href="/login">Login</a>
            </div>
          </form>
        </div>
      </div>
    </body>
  );
}

export default Register;

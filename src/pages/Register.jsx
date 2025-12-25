import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

function Register() {
  useEffect(() => {
    const registerBtn = document.getElementById('registerBtn');
    if (!registerBtn) return;

    const handleRegister = async () => {
      // Get form values
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const referralCode = document.getElementById('referralCode').value.trim();

      // Validation
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }

      // Generate unique referral code for new user
      const userReferralCode = 'UZ' + Math.random().toString(36).substring(2, 8).toUpperCase();

      try {
        // Get referrer ID if referral code provided
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

        // Show loading
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating account...';

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

        // Profile is created automatically by trigger
        // But we need to update it with additional data
        if (authData.user) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              name,
              phone,
              referral_code: userReferralCode,
              referred_by: referredBy,
              balance: 0,
              vip_level: 0,
              status: 'active'
            })
            .eq('id', authData.user.id);

          if (updateError) console.log('Profile update note:', updateError.message);
        }

        alert('Registration successful! Please check your email to verify your account.');
        window.location.href = '/verify-email';

      } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
        
        // Reset button
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register';
      }
    };

    registerBtn.addEventListener('click', handleRegister);

    return () => {
      registerBtn.removeEventListener('click', handleRegister);
    };
  }, []);

  return (
    <div className="auth-page-background">
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
                <input type="password" id="password" placeholder="Password (min. 6 characters)" required minLength="6" />
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
    </div>
  );
}

export default Register;

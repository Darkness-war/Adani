function VerifyEmail() {
  return (
    <div className="auth-page-background">
      <main className="auth-container">
        <div className="auth-card">
          <h2>✅ Almost Done!</h2>
          <p style={{ textAlign: 'center', lineHeight: '1.6' }}>
            We have sent a verification link to your email address.
            <br /><br />
            Please check your inbox (and spam folder) and click the link to complete your registration.
          </p>
          <a href="/login" className="submit-btn" style={{ textAlign: 'center', textDecoration: 'none', marginTop: '20px', display: 'block' }}>
            Go to Login
          </a>
        </div>
      </main>
    </div>
  );
}

export default VerifyEmail;

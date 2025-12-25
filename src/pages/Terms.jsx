import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Terms() {
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Terms & Conditions" />
      
      <main className="page-container">
        <div className="card static-content-card">
          <h3>Terms & Conditions</h3>
          
          <p>By accessing or using the UZUMAKI platform ("we", "our", "us"), you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree with any part of the Terms, you may not use the Service.</p>
          
          <h4>1. Eligibility</h4>
          <p>You must be at least 18 years old to use UZUMAKI. By using the platform, you confirm that you meet this requirement.</p>
          
          <h4>2. Platform Use</h4>
          <p>You agree to use the platform responsibly and not engage in harmful, fraudulent, or illegal activities. This includes but is not limited to:</p>
          <ul>
            <li>Creating multiple accounts for personal benefit.</li>
            <li>Using bots or automation tools to manipulate services.</li>
            <li>Abusing offers, bonuses, or referral systems.</li>
          </ul>
          
          <h4>3. Account Responsibility</h4>
          <p>You are responsible for all activities under your account. Keep your password safe and notify us immediately if you suspect unauthorized access.</p>
          
          <h4>4. Service Limitations</h4>
          <p>UZUMAKI does not guarantee uninterrupted service or error-free performance. We may modify, suspend, or discontinue Services at any time.</p>
          
          <h4>5. Financial Disclaimer</h4>
          <p>All investment or earning plans provided on UZUMAKI involve risk. We are not financial advisors. You make all decisions at your own risk.</p>
          
          <p><strong>Note:</strong> Past returns do not guarantee future performance.</p>
          
          <h4>6. Termination</h4>
          <p>UZUMAKI may suspend or terminate your account for violations of these Terms or for suspicious/abusive activity, without prior notice.</p>
          
          <h4>7. Changes to Terms</h4>
          <p>We may update these Terms anytime. Continued use of the platform after updates means you accept the revised Terms.</p>
          
          <h4>8. Legal Jurisdiction</h4>
          <p>All disputes will be handled under applicable Indian laws and fall under the jurisdiction of SERAMPORE UTTARPARA, WEST BENGAL.</p>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav />
    </>
  );
}

export default Terms;

import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Privacy() {
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Privacy Policy" />
      
      <main className="page-container">
        <div className="card static-content-card">
          <h3>Privacy Policy</h3>
          <p>Your privacy is important to us. This policy explains what personal data we collect from you and how we use it.</p>
          
          <h4>1. Data We Collect</h4>
          <p>We collect data to operate effectively and provide you with the best experiences. You provide some of this data directly, such as when you:</p>
          <ul>
            <li>Create an account (Email, Phone Number, Name).</li>
            <li>Make a recharge (Transaction information via our payment gateway).</li>
            <li>Contact us for support (Email or chat content).</li>
          </ul>
          <p>We also use Supabase services which may collect data automatically, such as device information and usage data, to ensure security and improve our service.</p>
          
          <h4>2. How We Use Your Data</h4>
          <p>We use the data we collect to:</p>
          <ul>
            <li>Provide and operate our services (like managing your account and balance).</li>
            <li>Process your transactions securely.</li>
            <li>Communicate with you, including for customer support.</li>
            <li>Ensure the security of our platform and prevent fraud.</li>
            <li>Comply with legal obligations.</li>
          </ul>
          
          <h4>3. Data Sharing</h4>
          <p>We do not sell your personal data to third parties. We may share your data with:
            <ul>
              <li>Our payment processing provider (PAY0) to securely process your payments.</li>
              <li>Service providers (like Supabase) that help us operate our platform.</li>
              <li>Law enforcement, if required by law.</li>
            </ul>
          </p>
          
          <h4>4. Data Security</h4>
          <p>We use a variety of security technologies and procedures (including Supabase security rules and encrypted connections) to help protect your personal data from unauthorized access, use, or disclosure.</p>
          
          <h4>5. Your Rights</h4>
          <p>You have the right to access and update your account information at any time through the "Mine" page on our website. If you wish to delete your account, please contact our customer support.</p>
          
          <h4>6. Changes to This Policy</h4>
          <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav />
    </>
  );
}

export default Privacy;

import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Refund() {
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Cancellations & Refunds" />
      
      <main className="page-container">
        <div className="card static-content-card">
          <h3>Cancellations & Refund Policy</h3>
          
          <h4>Recharges</h4>
          <p>All wallet recharges on UZUMAKI are final and non-refundable. Once funds are added to your wallet, they cannot be reversed or transferred back to your bank account, except through the official withdrawal system where applicable.</p>
          
          <h4>Investments</h4>
          <p>All investment purchases or plan activations are final. Once an investment is started, it cannot be cancelled. The principal amount remains locked until the plan's maturity period.</p>
          
          <h4>Failed Transactions</h4>
          <p>If money is deducted from your bank account but not reflected in your wallet within 2 hours, contact support immediately with:</p>
          <ul>
            <li>Transaction ID</li>
            <li>Payment screenshot</li>
            <li>Time of transaction</li>
          </ul>
          <p>Our team will verify the payment with the gateway. If successful, the amount will be credited to your wallet.</p>
          
          <h4>Support</h4>
          <p>For payment-related issues, contact our support team:<br />
          <a href="mailto:support@uzumaki.com">support@uzumaki.com</a></p>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav />
    </>
  );
}

export default Refund;

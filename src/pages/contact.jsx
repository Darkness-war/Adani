import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Contact() {
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Contact Us" />
      
      <main className="page-container">
        <div className="card static-content-card">
          <h3>Contact Us</h3>
          <p>If you have any questions, issues with a payment, or need support, please do not hesitate to reach out to our team.</p>
          
          <h4>Customer Support Email</h4>
          <p>For all inquiries, please email us at:
            <br />
            <a href="mailto:support@uzumaki.com">support@uzumaki.com</a>
          </p>
          
          <h4>Official Telegram</h4>
          <p>Join our official Telegram channel for updates or contact support via Telegram:
            <br />
            <a href="https://t.me/uzumaki_channel">https://t.me/uzumaki_channel</a>
          </p>
          
          <p>We aim to respond to all inquiries within 24 business hours.</p>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav />
    </>
  );
}

export default Contact;

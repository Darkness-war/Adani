import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Recharge from './pages/Recharge';
import Refer from './pages/Refer';
import Mine from './pages/Mine';
import ControlPanel from './pages/ControlPanel';
import SystemControl from './pages/SystemControl';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Contact from './pages/Contact';
import Transactions from './pages/Transactions';
import VerifyEmail from './pages/VerifyEmail';

// Import global CSS (copied from original style.css)
import './styles/style.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth status on load
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Store user ID in localStorage for backward compatibility
      if (user) {
        localStorage.setItem('uid', user.id);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        localStorage.setItem('uid', session.user.id);
      } else {
        localStorage.removeItem('uid');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        {/* Protected Routes */}
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/recharge" element={user ? <Recharge /> : <Navigate to="/login" />} />
        <Route path="/refer" element={user ? <Refer /> : <Navigate to="/login" />} />
        <Route path="/mine" element={user ? <Mine /> : <Navigate to="/login" />} />
        <Route path="/transactions" element={user ? <Transactions /> : <Navigate to="/login" />} />
        <Route path="/terms" element={user ? <Terms /> : <Navigate to="/login" />} />
        <Route path="/privacy-policy" element={user ? <Privacy /> : <Navigate to="/login" />} />
        <Route path="/refund" element={user ? <Refund /> : <Navigate to="/login" />} />
        <Route path="/contact" element={user ? <Contact /> : <Navigate to="/login" />} />
        
        {/* Admin Routes */}
        <Route path="/system-control" element={<SystemControl />} />
        <Route path="/control-panel" element={<ControlPanel />} />
        
        {/* Redirects */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

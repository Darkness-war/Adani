import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import register from './pages/register';
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

// Import global CSS
import './styles/style.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        localStorage.setItem('uid', user.id);
      }
      
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        localStorage.setItem('uid', session.user.id);
      } else {
        localStorage.removeItem('uid');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/system-control" element={<SystemControl />} />
        
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
        <Route path="/control-panel" element={user ? <ControlPanel /> : <Navigate to="/system-control" />} />
        
        {/* 404 Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

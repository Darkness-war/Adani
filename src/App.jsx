import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Recharge from "./pages/Recharge";
import Refer from "./pages/Refer";
import Mine from "./pages/Mine";
import Contact from "./pages/Contact";
import Transactions from "./pages/Transactions";
import VerifyEmail from "./pages/VerifyEmail";
import ControlPanel from "./pages/ControlPanel"
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";

// Styles
import "./styles/style.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user ?? null);
      } catch (err) {
        console.error(err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/recharge" element={user ? <Recharge /> : <Navigate to="/login" />} />
        <Route path="/refer" element={user ? <Refer /> : <Navigate to="/login" />} />
        <Route path="/mine" element={user ? <Mine /> : <Navigate to="/login" />} />
        <Route path="/transactions" element={user ? <Transactions /> : <Navigate to="/login" />} />
        <Route path="/contact" element={user ? <Contact /> : <Navigate to="/login" />} />

        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/refund" element={<Refund />} />

        <Route path="/control-panel" element={user ? <ControlPanel /> : <Navigate to="/login" />} />
        <Route path="/system-control" element={<SystemControl />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

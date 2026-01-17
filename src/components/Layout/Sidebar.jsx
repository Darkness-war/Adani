import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ isOpen, onClose, user }) => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  const role = user?.role || "user"; // user | admin

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="badge">
            Balance: ₹{user?.balance ?? 0}
          </span>
          <span className="badge vip">VIP {user?.vip ?? 0}</span>
          <button onClick={onClose}>✕</button>
        </div>

        <ul className="sidebar-menu">
          <li><Link to="/" onClick={onClose}>Home</Link></li>
          <li><a href="/app.apk">Download App (Android)</a></li>
          <li><Link to="/about" onClick={onClose}>About Us</Link></li>

          {role === "admin" && (
            <>
              <li><Link to="/controlpanel">Admin Panel</Link></li>
              <li><Link to="/systemcontrol">System Control</Link></li>
            </>
          )}

          <li className="toggle">
            <span>Dark Mode</span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </li>
        </ul>

        <div className="sidebar-footer">
          <button
            className="logout"
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

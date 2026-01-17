const TopBar = ({ onMenuClick }) => {
  return (
    <div className="topbar">
      <button className="menu-btn" onClick={onMenuClick}>
        ☰
      </button>
    </div>
  );
};

export default TopBar;

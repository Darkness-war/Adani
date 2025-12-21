function BottomNav({ active = '' }) {
  return (
    <footer className="bottom-nav">
      <a href="/" className={active === 'home' ? 'active' : ''}>
        <i className="fas fa-home"></i> Home
      </a>
      <a href="/recharge" className={active === 'recharge' ? 'active' : ''}>
        <i className="fas fa-bolt"></i> Recharge
      </a>
      <a href="/refer" className={active === 'refer' ? 'active' : ''}>
        <i className="fas fa-user-friends"></i> Refer
      </a>
      <a href="/mine" className={active === 'mine' ? 'active' : ''}>
        <i className="fas fa-user"></i> Mine
      </a>
    </footer>
  );
}

export default BottomNav;

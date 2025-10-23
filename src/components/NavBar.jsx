const Logo = () => (
  <div className="logo"><span>click</span> <span>talk</span></div>
);

const NavBar = ({ path, go }) => {
  const Item = ({ to, label }) => (
    <button
      className={`nav-btn ${path === to ? "active" : ""}`}
      onClick={() => go(to)}
    >
      {label}
    </button>
  );

  return (
    <header className="header">
      <div className="header-row">
        <button onClick={() => go("/")} aria-label="home">
          <Logo />
        </button>
        <nav className="nav-items">
          <Item to="/" label="click talk" />
          <Item to="/login" label="로그인" />
          <Item to="/wallet" label="내 지갑" />
          <Item to="/signup" label="회원가입" />
        </nav>
      </div>
    </header>
  );
};

export default NavBar;

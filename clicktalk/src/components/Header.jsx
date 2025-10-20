const Header = ({ go }) => {
  return (
    <header className="header">
      <div className="header-row">
        {/* 왼쪽 로고 */}
        <span className="logo" onClick={() => go("/")}>
          click talk
        </span>

        {/* 오른쪽 메뉴 */}
        <nav className="nav-items">
          <button className="nav-btn" onClick={() => go("/chat")}>
            clicktalk
          </button>
          <button className="nav-btn" onClick={() => go("/login")}>
            로그인
          </button>
          <button className="nav-btn" onClick={() => go("/wallet")}>
            내지갑
          </button>
          <button className="nav-btn" onClick={() => go("/signup")}>
            회원가입
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;

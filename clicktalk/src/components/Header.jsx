const Header = () => {
  return (
    <header className="header">
      <div className="header-row">
        {/* 왼쪽: 로고 */}
        <span className="logo">click talk</span>

        {/* 오른쪽: 메뉴 */}
        <nav className="nav-items">
          <button className="nav-btn active">clicktalk</button>
          <button className="nav-btn active">로그인</button>
          <button className="nav-btn active">내지갑</button>
          <button className="nav-btn active">회원가입</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;

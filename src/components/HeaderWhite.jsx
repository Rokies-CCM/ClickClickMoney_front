// HeaderWhite.jsx
const HeaderWhite = ({ go }) => {
  return (
    <header
      className="header"
      style={{
        backgroundColor: "#fff",
        borderBottom: "none", 
      }}
    >
      <div className="header-row">
        <span className="logo" onClick={() => go("/")}>
          click talk
        </span>

        <nav className="nav-items">
        <button className="nav-btn" onClick={() => go("/chat")}>clicktalk</button>
          <button className="nav-btn" onClick={() => go("/login")}>로그인</button>
          <button className="nav-btn" onClick={() => go("/wallet")}>내지갑</button>
          <button className="nav-btn" onClick={() => go("/signup")}>회원가입</button>
        </nav>
      </div>
    </header>
  );
};

export default HeaderWhite;

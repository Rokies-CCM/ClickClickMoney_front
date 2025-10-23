import hand from "../assets/hand.png"; // 이미지는 src/assets/hand.png에 두세요.

const StartPage = ({ go }) => (
  <section className="hero-center">
    <div className="phone">
      <div className="island" />
      <div className="statusL">9:41</div>
      <div className="statusR">◐  ▪︎▪︎</div>

      <div className="phone-inner">
        <div className="phone-content">
          {/* 왼쪽: 아이콘 */}
          <img src={hand} alt="" className="icon-hero" />
          {/* 오른쪽: 타이틀/문구/버튼 */}
          <div className="title-wrap">
            <div className="title-xxl">Click</div>
            <div className="title-xxl">Click</div>
            <div className="title-xxl">Talk Talk</div>
            <p className="subtitle">내 소비를 손쉽게 관리할 수 있는 톡톡</p>
            <div style={{ marginTop: 22 }}>
              <button className="btn" onClick={() => go("/login")}>
                시작하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default StartPage;
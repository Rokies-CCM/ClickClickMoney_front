import { useState } from "react";

/** 서비스명 → 해지/관리 페이지 매핑 + 스토어 결제 폴백 */
const getCancelUrl = (sub) => {
  // 인앱 결제라면 스토어로 우선 이동 (선택 필드: channel)
  if (sub?.channel === "googleplay")
    return "https://play.google.com/store/account/subscriptions";
  if (sub?.channel === "appstore")
    return "https://support.apple.com/en-us/118428";

  const n = (sub?.name || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[+]/g, ""); // 디즈니+ → 디즈니

  const MAP = {
    // 음악
    "멜론": "https://faqs2.melon.com/customer/faq/informFaq.htm?faqId=2212",
    "melon": "https://faqs2.melon.com/customer/faq/informFaq.htm?faqId=2212",
    "스포티파이": "https://www.spotify.com/account/subscription",
    "spotify": "https://www.spotify.com/account/subscription",

    // 글로벌 OTT
    "넷플릭스": "https://www.netflix.com/cancelplan",
    "netflix": "https://www.netflix.com/cancelplan",
    "디즈니플러스": "https://www.disneyplus.com/account/cancel-subscription",
    "disneyplus": "https://www.disneyplus.com/account/cancel-subscription",
    "애플tv": "https://support.apple.com/en-us/118398",       // Apple TV+ 해지 가이드
    "appletv": "https://support.apple.com/en-us/118398",
    "appletvplus": "https://support.apple.com/en-us/118398",
    "프라임비디오": "https://www.primevideo.com/help?nodeId=GWGDSNXVPJ93UW5V",
    "primevideo": "https://www.primevideo.com/help?nodeId=GWGDSNXVPJ93UW5V",

    // 국내 OTT
    "티빙": "https://www.tving.com/",                          // 로그인 후 MY/멤버십에서 관리
    "tving": "https://www.tving.com/",
    "웨이브": "https://www.wavve.com/",                        // 로그인 후 MY 이용권/결제
    "wavve": "https://www.wavve.com/",
    "왓챠": "https://help.watcha.co.kr/hc/ko/categories/4403928691353-%EA%B5%AC%EB%8F%85%EA%B6%8C-%ED%95%B4%EC%A7%80",
    "watcha": "https://help.watcha.co.kr/hc/ko/categories/4403928691353-%EA%B5%AC%EB%8F%85%EA%B6%8C-%ED%95%B4%EC%A7%80",

    // 기타
    "유튜브프리미엄": "https://www.youtube.com/paid_memberships",
    "youtube": "https://www.youtube.com/paid_memberships",
    "쿠팡플레이": "https://www.coupang.com/",                 // WOW 멤버십 관리 경유
    "coupangplay": "https://www.coupang.com/",
    "노션": "https://www.notion.so/settings/billing",
    "notion": "https://www.notion.so/settings/billing",
  };

  // 완전 일치/부분 포함 둘 다 커버
  const key =
    Object.keys(MAP).find((k) => n === k) ||
    Object.keys(MAP).find((k) => n.includes(k));

  return key ? MAP[key] : null;
};

const SubscriptionPage = () => {
  const [subscriptions, setSubscriptions] = useState([
    {
      name: "넷플릭스",
      price: 17000,
      nextPayment: "2025-11-05",
      category: "엔터테인먼트",
    },
    {
      name: "유튜브 프리미엄",
      price: 10900,
      nextPayment: "2025-11-10",
      category: "엔터테인먼트",
    },
    {
      name: "노션 플러스",
      price: 6000,
      nextPayment: "2025-11-02",
      category: "생산성",
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSub, setNewSub] = useState({
    name: "",
    price: "",
    nextPayment: "",
    category: "",
  });

  const totalPayment = subscriptions.reduce((sum, s) => sum + s.price, 0);

  const handleAddSubscription = () => {
    const { name, price, nextPayment, category } = newSub;
    if (!name || !price || !nextPayment || !category)
      return alert("모든 항목을 입력하세요!");

    setSubscriptions((prev) => [...prev, { ...newSub, price: Number(price) }]);
    setNewSub({ name: "", price: "", nextPayment: "", category: "" });
    setIsAddOpen(false);
  };

  const handleDelete = (index) => {
    const updated = subscriptions.filter((_, i) => i !== index);
    setSubscriptions(updated);
  };

  const handleCancel = (sub) => {
    const url = sub.cancelUrl || getCancelUrl(sub);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const q = encodeURIComponent(`${sub.name} 구독 해지`);
      window.open(`https://www.google.com/search?q=${q}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "100vw",
        minHeight: "100vh",
        backgroundColor: "#fff",
        padding: "40px clamp(16px, 5vw, 60px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* === 제목 === */}
        <div style={{ marginBottom: "30px", textAlign: "left" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            정기 결제
          </h1>
          <p style={{ color: "#555", fontSize: "15px" }}>
            구독 서비스를 관리하고 비용을 절감하세요.
          </p>
        </div>

        {/* === 상단 요약 카드 === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "30px",
          }}
        >
          <SummaryCard
            title="월 총 결제액"
            value={totalPayment.toLocaleString() + "원"}
            sub={`총 ${subscriptions.length}건의 거래`}
            highlight
          />
          <SummaryCard
            title="활성 구독"
            value={`${subscriptions.length}개`}
            sub="현재 이용 중"
          />
          <SummaryCard
            title="절감 가능액"
            value="15,000원"
            sub="AI 예측 기준"
            highlight
          />
        </div>

        {/* === 중복/유휴 경고 박스 === */}
        <div style={alertBoxStyle}>
          <h3 style={alertTitle}>중복 구독 발견</h3>
          <p style={alertText}>
            스포티파이와 애플 뮤직이 모두 활성화되어 있습니다. 하나를 해지하면
            매달 약 10,000원을 절약할 수 있습니다.
          </p>
        </div>

        <div style={alertBoxStyle}>
          <h3 style={alertTitle}>유휴 구독 감지</h3>
          <p style={alertText}>
            스포티파이를 최근 30일간 사용하지 않았습니다. 해지를 고려해보세요.
          </p>
        </div>

        {/* === 구독 목록 === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "40px 0 16px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 800 }}>구독 목록</h3>
          <button
            onClick={() => setIsAddOpen(true)}
            style={{
              backgroundColor: "#FFD858",
              border: "1px solid #000",
              borderRadius: "20px",
              padding: "8px 18px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + 구독 추가
          </button>
        </div>

        {/* === 구독 카드 === */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: "40px",
          }}
        >
          {subscriptions.map((s, i) => (
            <SubscriptionCard
              key={i}
              data={s}
              onCancel={() => handleCancel(s)}
              onDelete={() => handleDelete(i)}
            />
          ))}
        </div>
      </div>

      {/* === 추가 모달 === */}
      {isAddOpen && (
        <Modal onClose={() => setIsAddOpen(false)}>
          <h3
            style={{ fontSize: "20px", fontWeight: 700, marginBottom: "20px" }}
          >
            구독 추가
          </h3>

          <input
            type="text"
            placeholder="서비스 이름"
            value={newSub.name}
            onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="월 요금 (원)"
            value={newSub.price}
            onChange={(e) => setNewSub({ ...newSub, price: e.target.value })}
            style={inputStyle}
          />
          <input
            type="date"
            value={newSub.nextPayment}
            onChange={(e) =>
              setNewSub({ ...newSub, nextPayment: e.target.value })
            }
            style={inputStyle}
          />
          <select
            value={newSub.category}
            onChange={(e) =>
              setNewSub({ ...newSub, category: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">카테고리 선택</option>
            <option value="엔터테인먼트">엔터테인먼트</option>
            <option value="생산성">생산성</option>
            <option value="기타">기타</option>
          </select>

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={handleAddSubscription}
              style={{
                backgroundColor: "#FFD858",
                border: "1px solid #000",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              추가
            </button>
            <button
              onClick={() => setIsAddOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              닫기
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
};

/* 🔸 SummaryCard — hover 강조 버전 (교체) */
const SummaryCard = ({ title, value, sub, highlight }) => (
  <div
    style={{
      flex: 1,
      border: "1px solid #ccc",           // 기본 테두리
      borderRadius: "12px",
      padding: "28px 32px",
      background: "#fff",
      transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
      willChange: "transform, box-shadow, border-color",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-6px)";
      e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
      e.currentTarget.style.borderColor = "#FFD858";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "#ccc";
    }}
  >
    <p style={{ fontWeight: 700, marginBottom: "6px" }}>{title}</p>
    <p
      style={{
        color: highlight ? "#FF9900" : "#000",
        fontWeight: 700,
        fontSize: "18px",
        marginBottom: "4px",
      }}
    >
      {value}
    </p>
    {sub ? <p style={{ color: "#888", fontSize: "13px" }}>{sub}</p> : null}
  </div>
);


/* 🔸 SubscriptionCard — hover 강조 (테두리 색 변경 없음) */
const SubscriptionCard = ({ data, onCancel, onDelete }) => (
  <div
    style={{
      border: "1px solid #aaa",          // 테두리 색 고정
      borderRadius: "14px",
      padding: "24px 28px",
      backgroundColor: "#fff",
      transition: "transform .2s ease, box-shadow .2s ease",
      willChange: "transform, box-shadow",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-6px)";
      e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
      // 테두리색은 바꾸지 않음
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}
    >
      <h4 style={{ fontWeight: 700, fontSize: "16px" }}>{data.name}</h4>
      <span
        style={{
          fontSize: "12px",
          backgroundColor: "#FFD858",
          padding: "4px 8px",
          borderRadius: "8px",
          border: "1px solid #000",
          fontWeight: 600,
        }}
      >
        {data.category}
      </span>
    </div>

    <p style={{ color: "#555", fontSize: "13px", marginBottom: "6px" }}>
      다음 결제일: <b style={{ color: "#000" }}>{data.nextPayment}</b>
    </p>
    <p style={{ fontWeight: 700, color: "#E85A00", fontSize: "15px" }}>
      {data.price.toLocaleString()}원 / 월
    </p>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "6px",
        marginTop: "14px",
      }}
    >
      <button
        style={{
          background: "#f8f8f8",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "6px",
          cursor: "pointer",
        }}
      >
        수정
      </button>

      <button
        onClick={onCancel}
        aria-label={`${data.name} 해지 페이지로 이동`}
        style={{
          background: "#fff",
          border: "1px solid #E6A100",
          borderRadius: "8px",
          color: "#A66A00",
          fontWeight: 700,
          padding: "6px",
          cursor: "pointer",
        }}
      >
        해지
      </button>

      <button
        onClick={onDelete}
        style={{
          background: "#fff",
          border: "1px solid #FF6B6B",
          borderRadius: "8px",
          color: "#FF6B6B",
          fontWeight: 600,
          padding: "6px",
          cursor: "pointer",
        }}
      >
        삭제
      </button>
    </div>
  </div>
);


const Modal = ({ children }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.3)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        background: "#fff",
        padding: "40px 60px",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
        textAlign: "center",
        minWidth: "420px",
      }}
    >
      {children}
    </div>
  </div>
);

const alertBoxStyle = {
  border: "1px solid #aaa",
  borderRadius: "10px",
  padding: "24px 30px",
  backgroundColor: "#fafafa",
  marginBottom: "24px",
};

const alertTitle = {
  fontSize: "16px",
  fontWeight: 700,
  marginBottom: "6px",
};

const alertText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: 1.6,
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
};

export default SubscriptionPage;

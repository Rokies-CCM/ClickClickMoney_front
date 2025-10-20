import { useState } from "react";

const MissionPage = () => {
    // 탭 상태: 전체 / 완료 / 진행중
    const [activeTab, setActiveTab] = useState("전체");

    // 임시 미션 데이터
    const missions = [
        {
            id: 1,
            title: "금융 퀴즈",
            desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
            progress: 1,
            total: 3,
            point: 30,
        },
        {
            id: 2,
            title: "웹 페이지 방문",
            desc: "웹 페이지 방문 후 체크인 하기",
            progress: 1,
            total: 3,
            point: 30,
        },
        {
            id: 3,
            title: "금융 퀴즈",
            desc: "오늘의 금융 상식 퀴즈 3문제 풀기",
            progress: 1,
            total: 1,
            point: 30,
        },
    ];

    // 필터링
    const filteredMissions = missions.filter((m) => {
        if (activeTab === "전체") return true;
        if (activeTab === "완료") return m.progress >= m.total;
        if (activeTab === "진행중") return m.progress < m.total;
        return true;
    });

    return (
        <section
            style={{
                minHeight: "100vh",
                backgroundColor: "#fff",
                padding: "40px 60px",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* === 제목 === */}
            <div style={{ marginBottom: "30px" }}>
                <h1
                    style={{
                        fontSize: "32px",
                        fontWeight: 800,
                        marginBottom: "8px",
                        marginLeft: "80px",
                    }}
                >
                    미션
                </h1>
                <p style={{ color: "#555", fontSize: "15px", marginLeft: "80px" }}>
                    미션을 완료하고 포인트를 획득하세요.
                </p>
            </div>

            {/* === 탭 메뉴 === */}
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "24px",
                    marginLeft: "80px",
                }}
            >
                {["전체", "완료", "진행중"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background:
                                activeTab === tab ? "#000" : "rgba(0,0,0,0.05)",
                            color: activeTab === tab ? "#fff" : "#000",
                            border: "none",
                            borderRadius: "20px",
                            padding: "8px 22px",
                            fontSize: "15px",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            {/* === 미션 카드 영역 === */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", // ✅ 카드 균등 정렬
                    justifyItems: "center", // 가운데 정렬
                    alignItems: "start", // 카드 높이 균일하게 위로 정렬
                    gap: "70px", // 카드 간격 일정하게
                    width: "100%",
                    maxWidth: "1100px", // 전체 영역 너비 제한 (너무 퍼지지 않게)
                    margin: "10px auto 0", // 화면 가운데 정렬
                }}
            >
                {filteredMissions.map((m) => {
                    const percent = Math.round((m.progress / m.total) * 100);
                    const isDone = percent >= 100;

                    return (
                        <div
                            key={m.id}
                            style={{
                                width: "320px", // 카드 너비 고정
                                minHeight: "260px",
                                border: "1.5px solid #000",
                                borderRadius: "12px",
                                padding: "24px 20px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                backgroundColor: "#fff",
                                transition: "transform 0.25s ease",
                                marginRight: "10px",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.transform = "translateY(-6px)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.transform = "translateY(0)")
                            }
                        >
                            {/* 상단 상태 */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "12px",
                                }}
                            >
                                <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{m.title}</h3>
                                <span
                                    style={{
                                        fontSize: "12px",
                                        padding: "4px 10px",
                                        borderRadius: "10px",
                                        backgroundColor: "#FFD858",
                                        border: "1px solid #000",
                                        fontWeight: 600,
                                    }}
                                >
                                    {isDone ? "완료" : "진행중"}
                                </span>
                            </div>

                            {/* 설명 */}
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "#444",
                                    marginBottom: "10px",
                                }}
                            >
                                {m.desc}
                            </p>

                            {/* 진행률 */}
                            <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                                진행률
                            </p>
                            <div
                                style={{
                                    backgroundColor: "#eee",
                                    height: "8px",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                    marginBottom: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        width: `${percent}%`,
                                        height: "100%",
                                        backgroundColor: "#000",
                                    }}
                                ></div>
                            </div>
                            <p style={{ fontSize: "13px", color: "#555" }}>
                                {m.progress}/{m.total}
                            </p>

                            {/* 하단 포인트 / 버튼 */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: "14px",
                                }}
                            >
                                <span style={{ fontSize: "14px", fontWeight: 600 }}>
                                    {m.point} p
                                </span>
                                <button
                                    style={{
                                        backgroundColor: "#FFD858",
                                        border: "1px solid #000",
                                        borderRadius: "20px",
                                        padding: "6px 14px",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

        </section>
    );
};

export default MissionPage;

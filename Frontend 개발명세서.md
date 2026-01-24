# Frontend 개발 명세서

## 1. 기술 스택

- **Framework**: React 18
- **언어**: JavaScript
- **상태 관리**: Redux Toolkit
- **스타일링**: Tailwind CSS
- **빌드**: Vite

## 2. 프로젝트 구조

```
frontend/
├─ src/
│  ├─ api/
│  │  ├─ auth.js                          # 로그인/회원가입 API
│  │  ├─ budget.js                        # 예산 API
│  │  ├─ consumption.js                   # 소비내역 API
│  │  ├─ http.js                          # axios
│  │  └─ memo.js                          # 메모 API
│  ├─ assets/
│  │  ├─ hand.png
│  │  └─ react.svg
│  ├─ components/
│  │  ├─ BudgetCard.jsx                   # 예산 카드
│  │  ├─ Button.jsx                       # 공통 버튼
│  │  ├─ Header.jsx                       # 컬러 헤더
│  │  ├─ HeaderWhite.jsx                  # 화이트 헤더
│  │  ├─ MainHeader.jsx                   # 메인 상단 헤더
│  │  ├─ MissionCard.jsx                  # 미션/퀘스트 카드
│  │  ├─ NavBar.jsx                       # 상단/사이드 내비바
│  │  ├─ PointCard.jsx                    # 포인트 카드
│  │  └─ Sidebar.jsx                      # 사이드바 레이아웃
│  ├─ pages/
│  │  ├─ AccountBookPage.jsx              # 가계부(리스트/업로드)
│  │  ├─ ChatbotPage.jsx                  # AI 챗봇 화면
│  │  ├─ DashboardPage.jsx                # 메인 대시보드
│  │  ├─ ExpenseAnalysisPage.jsx          # 소비 분석(차트/인사이트)
│  │  ├─ LoginPage.jsx                    # 로그인
│  │  ├─ MissionPage.jsx                  # 절약 미션
│  │  ├─ PointPage.jsx                    # 포인트
│  │  ├─ SignupPage.jsx                   # 회원가입
│  │  ├─ StartPage.jsx                    # 시작페이지
│  │  └─ SubscriptionPage.jsx             # 구독/고정비 관리
│  ├─ router/
│  │  └─ useHashRoute.js                  # 해시 라우터 훅(라우팅 테이블)
│  ├─ styles/                             # 전역 스타일
│  │  ├─ globals.css                      # 전역 리셋/기본값
│  │  ├─ tokens.css                       # 색/간격 등 디자인 토큰
│  │  └─ ui.css                           # 공통 UI 유틸 클래스
│  ├─ utils/
│  │  └─ (files…)
│  ├─ App.css
│  ├─ App.jsx                             # 라우팅/레이아웃 루트 컴포넌트
│  ├─ index.css
│  └─ main.jsx
├─ .env
├─ .gitignore
├─ README.md
├─ eslint.config.js
├─ index.html
├─ package-lock.json
├─ package.json
└─ vite.config.js

```

## 3. 환경 설정

```env
VITE_API_BASE= /api
REACT_APP_API_URL=
REACT_APP_AI_URL=
```

## 4. 주요 페이지

| 페이지         | 컴포넌트            | 기능                     |
| -------------- | ------------------- | ------------------------ |
| /              | StartPage           | 진입 화면                |
| /login         | LoginPage           | 로그인                   |
| /signup        | SignupPage          | 회원가입                 |
| /dashboard     | DashboardPage       | 대시보드(요약 지표/알림) |
| /account       | AccountBookPage     | 가계부 목록·업로드·수정  |
| /analysis      | ExpenseAnalysisPage | 소비 분석(차트/인사이트) |
| /chat          | ChatbotPage         | AI 챗봇 대화             |
| /missions      | MissionPage         | 절약 미션/퀘스트         |
| /points        | PointPage           | 포인트/리워드 관리       |
| /subscriptions | SubscriptionPage    | 구독·고정비 관리         |

## 5. 컴포넌트

**5.1 공통 컴포넌트**
컴포넌트 역할

- Header | 상단 내비게이션/브랜드/빠른 이동
- Sidebar | 좌측 메뉴(대시보드/가계부/분석/챗봇 등)
- Button | 공통 버튼(일관된 스타일/상태)
- NavBar | 상단/내부 섹션 네비게이션
- Header | HeaderWhite 라이트 테마 헤더
- Main | MainHeader 대시보드 상단 요약 헤더

**5.2 페이지 컴포넌트**
컴포넌트 역할

- StartPage | 랜딩·소개 화면, 로그인/회원가입 유도
- LoginPage | 로그인 페이지, 사용자 인증
- SignupPage | 회원가입 페이지, 신규 계정 등록
- DashboardPage | 대시보드, 월간 요약·알림·인사이트 표시
- AccountBookPage | 가계부 리스트·업로드·편집
- ExpenseAnalysisPage | 소비 분석 차트 및 인사이트 시각화
- ChatbotPage | AI 챗봇 인터페이스(실시간 스트리밍 대화)
- MissionPage | 절약 미션 관리·진행 현황·보상 조회
- PointPage | 포인트 및 리워드 내역 관리
- SubscriptionPage | 구독·고정비 내역 관리 및 수정

## 6. API 연동

**6.1 연결 모듈**

- 클라이언트: axios 기반
- 요청 인터셉터: Authorization: Bearer <token> 자동 주입
- 응답 인터셉터: 401 처리(로그아웃/리다이렉트), 공통 에러 핸들링

**6.2 서비스 모듈**

- authService (src/api/auth.js): POST /auth/login, POST /auth/register
- budgetService (src/api/budget.js): POST/PUT/GET/DELETE /budgets
- consumptionService (src/api/consumption.js): POST /consumption/upload, GET /consumption, GET /insights/weekly
- memoService (src/api/memo.js): CRUD /memos
- chatService (src/api/chat.js, 선택): POST /chat(단건), GET /chat/stream(SSE)

## 8. 주요 기능

- 소비 내역 업로드 | 직접 소비 내역을 입력 해 내역을 저장
- 소비 내역 분석 | 업종·기간별 소비 패턴 분석 및 시각화(그래프/차트 제공)
- 예산 관리 | 월별 예산 설정, 소진률 계산 및 초과 시 알림
- 메모 관리 | 거래별 메모 추가·수정으로 개인 메모 기록 가능
- AI 챗봇 코칭 | AI 챗봇이 소비 습관을 분석해 절약 조언 제공
- 미션/리워드 시스템 | 절약 미션 수행 시 포인트·리워드 지급
- 구독 관리 | 고정비(구독·정기 결제) 자동 분류 및 관리
- 반응형 디자인 | PC·모바일 환경 모두 대응하는 인터페이스
- 보안 인증 | JWT 기반 사용자 인증 및 개인 데이터 보호

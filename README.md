# 💸 ClickClickMoney (클릭클릭머니)
**LangChain 기반 개인 소비 분석 & 절약 코치 챗봇**

> “LLM이 가계부를 분석해 생활습관까지 이해하고,  
> 실행 가능한 절약 플랜을 제안합니다.”
<img width="2504" height="1370" alt="스크린샷 2026-01-24 222957" src="https://github.com/user-attachments/assets/d9734382-8db8-4902-b930-7bf6f5e7b06e" />

---

## 1. 프로젝트 개요

### 1.1 프로젝트명
**ClickClickMoney (클릭클릭머니)**  
LangChain 기반 개인 소비 분석 & 절약 코치 챗봇

### 1.2 프로젝트 목적
- 로그인 사용자의 **소비 내역을 안전하게 수집·정규화**
- **LangChain / LangGraph 파이프라인**으로 소비 패턴 자동 분석
- **과소비 구간·누수 비용 진단** 및 인사이트 제공
- **맞춤 절약 시나리오·카테고리별 예산·액션 플랜**을 챗봇 대화로 제안

### 1.3 타깃 사용자
- **대학생·사회초년생**  
  첫 가계부 시작, 소액 고정비·구독 관리 필요
- **직장인**  
  카드 다중 사용, 외식·숙박 등 변동비 최적화 필요
- **가족 단위**  
  공용 지출(공과금·식비) 관리 및 월 예산 통제 필요

### 1.4 핵심 가치 제안 (UVP)
> **“LLM이 가계부를 분석해 생활습관까지 이해하고  
> 실행 가능한 절약 플랜을 제안한다.”**

---

## 2. 주요 기능

### 2.1 데이터 입력 / 동기화
- 수동 소비 내역 입력
- **카테고리 자동 분류**
  - 머천트명 · 메모 · 금액 패턴 기반 Rule
  - LLM 보정 분류

### 2.2 분석 & 인사이트
- **월간 / 주간 대시보드**
  - 총지출, 카테고리 비중
  - 고정비 · 변동비 분해
  - 구독 추정
- **과소비 감지**
  - 전월·전년 동월 대비 급증 카테고리
  - 시간대 / 요일 패턴 분석
- **누수 비용 포착**
  - 미사용 구독
  - 소액 결제 누적
  - 배달·편의점 과다 지출
- **목표 / 예산 관리**
  - 카테고리별 예산 설정
  - 리밸런싱 제안

### 2.3 LLM 코치 (챗봇)
- **질의응답**
  - “이번 달 커피에 얼마 썼어?”
  - “배달 줄이면 얼마 절약돼?”
- **절약 플랜 제안**
  - 예) `2주간 외식 20% 감축 → 예상 절감액 32,000원`
- **대안 추천**
  - 교통 · 통신 · 구독 플랜 변경 시나리오
  - 예상 절감액 시뮬레이션
- **행동 유도**
  - 체크리스트 / 미션 (예: 7일 배달 금지)
  - 완료 시 피드백 루프 제공

### 2.4 리포트 & 알림
- **주간 브리핑** (월요일 오전)
  - 지난주 지출 요약
  - 위험 카테고리 알림
- **월말 리포트**
  - 저축률
  - 예산 달성도
  - 다음 달 권장 예산

### 2.5 소비 절약 퀴즈
- LLM 생성 **소비 절약 퀴즈**
- 정답 시 **포인트 적립**

---

## 3. 사용자 시나리오 (요약)
1. 회원가입 / 로그인  
2. 소비 내역 업로드  
3. 자동 분류 · 정규화 완료 알림  
4. 사용자 질문  
   > “이번 달 배달 왜 많아?”  
5. 최근 3개월 대비 **+42% 증가 인사이트 제공**  
6. 챗봇이  
   - 배달 주 1회 제한 미션  
   - 월 **3만 원 절감 플랜** 제안

---

## 4. 아키텍처

### 4.1 전체 구조
- **Frontend**  
  React + Vite + TypeScript + Tailwind + shadcn/ui, Zustand
- **Backend (API)**  
  Spring Boot, JWT 인증, REST API
- **AI 서비스**  
  Python, LangChain / LangGraph  
  (요청 라우팅 · 프롬프트 체이닝 · Tool 호출)
- **DB**
  - PostgreSQL: 거래 · 예산 · 유저
  - Vector DB (Chroma / pgvector): 사용자 히스토리, 개인화 메모 RAG
- **Infra**
  Docker, GitHub Actions  
  AWS (EC2, RDS, S3)  
  Prometheus / Grafana 모니터링

### 4.2 LangChain / LangGraph 설계
- **Router Graph**
  - 사용자 질의 → `Q&A / 분석 / 액션 생성` 분기
- **Tooling**
  - `SQLDatabaseChain` : 소비 데이터 집계
  - `Python REPL Tool` : 절약액 시뮬레이션
  - `RetrievalQA` : 개인 메모·규칙 RAG
- **메모리**
  - 사용자별 대화 세션
  - 행동 수용 / 거부 기록 → 제안 품질 개선
- **안전장치**
  - Structured Output (함수 호출 스펙 강제)
  - 민감정보 접근 차단

---


## 5. 데이터 모델 (요약)
```text
users(id, email, hashed_pw)
consumption(id, user_id, date, category_id, amount, memo)
categories(id, name, type)
budget(id, user_id, budget_month)
subscriptions(id, user_id, merchant, cycle, last_paid_at, est_monthly)
insights(id, user_id, period, type, payload, accepted)

---


## 6. Frontend 구현 상세

> 본 프로젝트에서 프론트엔드는  
> **소비·분석·AI 결과를 사용자가 이해하고 행동할 수 있는 UX로 변환하는 역할**을 담당했습니다.

---

### 6.1 Frontend 기술 스택
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Chart / Visualization**: Recharts
- **Networking**: REST API (Fetch / Axios)
- **Real-time**: SSE / WebSocket (챗봇 스트리밍)
- **Auth 처리**: JWT 기반 인증 상태 관리

---

### 6.2 데이터 모델과 화면 연계 구조

백엔드 데이터 모델을 **프론트 UI 도메인 단위로 재구성**하여 사용했습니다.

| Backend Model | Frontend 활용 방식 |
|---|---|
| `consumption` | 소비 리스트, 대시보드 집계, 챗봇 질의 기준 데이터 |
| `categories` | 카테고리 필터, 차트 색상·라벨 기준 |
| `budget` | 예산 Progress Bar, 초과 경고 UI |
| `subscriptions` | 고정비/누수 비용 강조 카드 |
| `insights` | 챗봇 응답 카드, 리포트 요약 데이터 |

---

### 6.3 주요 화면별 프론트 구현 포인트

#### 소비 입력 & 관리 화면
- 소비 내역 수동 입력 폼
- 자동 분류 결과를 **사용자가 즉시 수정 가능한 UX**
- 잘못된 분류에 대한 **Inline Editing**
- 입력 즉시 대시보드 반영으로 피드백 지연 최소화
<img width="2517" height="1381" alt="스크린샷 2026-01-24 222857" src="https://github.com/user-attachments/assets/2ed01544-49f5-4d6d-8c80-e8433e53f669" />

#### 소비 대시보드
- 월간 / 주간 소비 요약 카드
- 카테고리별 지출 비중 차트
- 전월 대비 증감 시 시각적 강조(컬러·아이콘)
- 과소비 카테고리 우선 노출
<img width="2502" height="1376" alt="스크린샷 2026-01-24 222920" src="https://github.com/user-attachments/assets/99a5fb31-6d93-4e6f-88c6-418220fcd19c" />

#### 예산 관리 UI
- 카테고리별 예산 설정
- 예산 대비 사용률을 Progress Bar로 시각화
- 예산 초과 시 색상 변화 및 챗봇 액션 CTA 노출

#### LLM 코치 챗봇 UI
- SSE / WebSocket 기반 스트리밍 응답
- LLM 응답을 구조화된 카드 UI로 표현
  - 수치 요약
  - 절감액 계산 결과
  - 실행 미션 버튼
- “응답 → 행동”으로 이어지는 UX 설계
<img width="2493" height="1368" alt="스크린샷 2026-01-24 222942" src="https://github.com/user-attachments/assets/dfde7cfe-3bb2-42a0-91db-1c5b3f00b9fe" />

#### 주식증권 실시간 확인 UI
- 증권사 api 연결
 - 시가총액, 거래량 top 12 주식 실시간 확인 가능
<img width="1750" height="1043" alt="스크린샷 2025-10-24 161347" src="https://github.com/user-attachments/assets/b180db3a-0de9-429b-bb56-01c1da23107f" />

---

### 6.4 상태 관리 설계 (Zustand)
- 도메인 단위 Store 분리
  - `authStore`
  - `consumptionStore`
  - `budgetStore`
  - `chatStore`
- 서버 상태와 UI 상태 분리
- 스트리밍 중에도 UI 리렌더링 최소화

---

### 6.5 UX 설계 포인트
- 숫자 중심 데이터 → 행동 중심 정보로 변환
- 항상 **“그래서 사용자가 무엇을 하면 되는지”** 제시
- 요약 → 상세 Drill-down 정보 구조
- 모바일 / 데스크톱 반응형 UI

---

### 6.6 성능 & 사용성 개선
- 컴포넌트 분리로 불필요한 리렌더링 최소화
- 차트 영역 메모이제이션
- Skeleton UI로 로딩 상태 명확화
- 스트리밍 응답으로 체감 대기 시간 감소

---

### 6.7 프론트엔드 관점에서의 배운 점
- 소비·금융 데이터를 UX 언어로 번역하는 경험
- AI 결과를 신뢰 가능한 정보 구조로 가공하는 역할의 중요성
- 단순 화면 구현을 넘어 **행동을 유도하는 UI 설계**

---

## Frontend Summary
> **복잡한 소비·AI 데이터를  
> 사용자가 이해하고 실천할 수 있는 UX로 구현한 프론트엔드 프로젝트**


---

## 7. 백엔드 / AI 협업 포인트

- REST API 명세 기반 개발
- 소비 데이터 구조 변경 시 **프론트에서 안전하게 대응 가능하도록 방어적 렌더링**
- 챗봇 응답을 JSON Schema 기반으로 받아 **UI 컴포넌트에 매핑**

---

## 8. 프론트엔드 관점에서의 배운 점

- 복잡한 금융 데이터를 **UX 언어로 번역하는 경험**
- 단순 화면 구현이 아닌  
  → *“사용자가 실제로 행동하게 만드는 UI”의 중요성*
- AI 결과를 그대로 보여주지 않고  
  **신뢰 가능한 정보 구조로 가공하는 역할의 중요성**

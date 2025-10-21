import { http, setToken, getToken, clearToken } from "./http";

// 회원가입 (백엔드 DTO: { username, password })
export const register = (username, password) =>
  http("POST", "/click/register", { username, password });

// 로그인 → accessToken 저장
export const login = async (username, password) => {
  const resp = await http("POST", "/click/login", { username, password });
  // LoginResponse: { accessToken, tokenType: "Bearer" }
  const token = resp?.accessToken;
  if (!token) throw new Error("accessToken이 없습니다.");
  setToken(token);
  return resp;
};

// 내 정보 (백엔드: @AuthenticationPrincipal User → username 문자열 반환)
export const me = () =>
  http("GET", "/click/me", undefined, true);

// 로그아웃(프론트 로컬 토큰만 제거)
export const logout = () => clearToken();

// 현재 인증 여부
export const isAuthed = () => Boolean(getToken());

// src/api/auth.js
import { http, setToken, getToken, clearToken } from "./http";

// 회원가입
export const register = (username, password) =>
  http("POST", "/click/register", { body: { username, password } });

// 로그인 → accessToken 저장
export const login = async (username, password) => {
  const resp = await http("POST", "/click/login", { body: { username, password } });

  // 백엔드가 ApiResponse< LoginResponse > 형태이므로 data 안도 체크
  const token =
    resp?.accessToken ||
    resp?.token ||
    resp?.data?.accessToken ||
    resp?.data?.token;

  if (!token) {
    throw new Error("accessToken이 없습니다. (응답 구조를 확인하세요)");
  }
  setToken(token);
  return resp;
};

// 내 정보 (Authorization 헤더 첨부)
export const me = () => http("GET", "/click/me", { auth: true });

// 로그아웃(로컬 토큰 제거)
export const logout = () => clearToken();

// 현재 인증 여부
export const isAuthed = () => Boolean(getToken());

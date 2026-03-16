import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function login(
  username: string,
  password: string
): Promise<{ access: string; refresh: string }> {
  const { data } = await axios.post(`${BASE_URL}/api/auth/token/`, {
    username,
    password,
  });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

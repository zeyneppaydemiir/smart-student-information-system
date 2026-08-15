// Backend fullName gönderir; tüm sayfalar user?.name kullandığından
// kaydetmeden önce name = fullName olarak normalize ediyoruz.
export function login(token, user) {
  localStorage.setItem("token", token);
  const normalized = { ...user, name: user.fullName ?? user.name ?? "" };
  localStorage.setItem("user", JSON.stringify(normalized));
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isLoggedIn() {
  return !!getToken();
}

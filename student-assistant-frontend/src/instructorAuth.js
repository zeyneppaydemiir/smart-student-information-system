export function loginInstructor(token, instructor) {
  localStorage.setItem("instructorToken", token);
  localStorage.setItem("instructor", JSON.stringify(instructor));
}

export function logoutInstructor() {
  localStorage.removeItem("instructorToken");
  localStorage.removeItem("instructor");
}

export function getInstructor() {
  const i = localStorage.getItem("instructor");
  return i ? JSON.parse(i) : null;
}

export function getInstructorToken() {
  return localStorage.getItem("instructorToken");
}

export function isInstructorLoggedIn() {
  return !!getInstructorToken();
}

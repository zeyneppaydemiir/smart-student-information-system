import axios from "axios";

const instructorApi = axios.create({ baseURL: "http://localhost:3001/api/instructor" });

instructorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("instructorToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instructorApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("instructorToken");
      localStorage.removeItem("instructor");
      window.location.href = "/instructor/login";
    }
    return Promise.reject(error);
  }
);

export default instructorApi;

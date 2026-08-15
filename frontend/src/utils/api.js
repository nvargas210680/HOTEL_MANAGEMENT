const BASE_URL = "http://127.0.0.1:8000";

export async function apiFetch(endpoint, options = {}) {
  let accessToken = localStorage.getItem("accessToken");

  
  const headers = {
    "Content-Type": "application/json",
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });


  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      const refreshResponse = await fetch(`${BASE_URL}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        
        localStorage.setItem("accessToken", refreshData.access);
        if (refreshData.refresh) {
          localStorage.setItem("refreshToken", refreshData.refresh);
        }

        headers["Authorization"] = `Bearer ${refreshData.access}`;
        response = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
  }

  return response;
}
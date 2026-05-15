const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`

const getAccessToken = () => localStorage.getItem("token")
const setAccessToken = (token) => localStorage.setItem("token", token)
const clearAccessToken = () => localStorage.removeItem("token")

const redirectToAuth = () => {
  if (window.location.pathname !== "/auth") {
    window.history.pushState({}, "", "/auth")
    window.dispatchEvent(new PopStateEvent("popstate"))
  }
}

async function refreshAccessToken() {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    clearAccessToken()
    throw new Error("Refresh token failed")
  }

  const data = await response.json()
  const accessToken = data.data?.accessToken

  if (!accessToken) {
    clearAccessToken()
    throw new Error("Access token not found")
  }

  setAccessToken(accessToken)
  return accessToken
}

async function request(endpoint, options = {}, shouldRetry = true) {
  const token = getAccessToken()
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const config = {
    ...options,
    credentials: "include",
    headers,
  };  
  console.log("token", config);
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401 && shouldRetry && !options.skipAuthRefresh) {
        try {
          const newAccessToken = await refreshAccessToken()

          return request(
            endpoint,
            {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newAccessToken}`,
              },
            },
            false
          )
        } catch (refreshError) {
          redirectToAuth()
          throw refreshError
        }
      }

      const error = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: error.message || `HTTP Error ${response.status}`,
      };
    }

    if (response.status === 204) return null;

    return await response.json();

  } catch (err) {
    throw err;
  }
}

// Expose các method tiện dụng
const http = {
  get:    (endpoint, options) =>
            request(endpoint, { method: 'GET', ...options }),

  post:   (endpoint, body, options) =>
            request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),

  put:    (endpoint, body, options) =>
            request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),

  patch:  (endpoint, body, options) =>
            request(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),

  delete: (endpoint, options) =>
            request(endpoint, { method: 'DELETE', ...options }),
};

export { clearAccessToken, getAccessToken, refreshAccessToken, setAccessToken }
export default http;

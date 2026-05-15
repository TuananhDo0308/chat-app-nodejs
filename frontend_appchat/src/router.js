import { getAccessToken, refreshAccessToken } from "./config/http.js";

const routes = {};
const rootEl = () => document.getElementById("app");

const push = (path, replace = false) => {
  if (window.location.pathname === path) return;

  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }

  resolve();
};

const isAuthenticated = async () => {
  if (getAccessToken()) return true;

  try {
    await refreshAccessToken();
    return true;
  } catch {
    return false;
  }
};

const resolve = async () => {
  const path = window.location.pathname === "/" ? "/users" : window.location.pathname;
  const route = routes[path];

  if (!route) {
    rootEl().innerHTML = "";
    push("/users", true);
    return;
  }

  if (route.protected && !(await isAuthenticated())) {
    push("/auth", true);
    return;
  }

  if (path === "/auth" && await isAuthenticated()) {
    push("/users", true);
    return;
  }

  rootEl().innerHTML = "";
  route.handler(rootEl());
};

const on = (path, handler, options = {}) => {
  routes[path] = {
    handler,
    protected: Boolean(options.protected),
  };
};

const init = () => {
  window.addEventListener("popstate", resolve);
  resolve();
};

export default { init, on, push };

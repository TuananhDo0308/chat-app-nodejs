import http from "../config/http.js"

const authService = {
    async register(body) {
        const data = await http.post("/auth/register", body)
        return data
    },
    async login(body) {
        const data = await http.post("/auth/login", body)
        return data
    },
    async refresh() {
        const data = await http.post("/auth/refresh", undefined, {
            skipAuthRefresh: true,
        })
        return data
    },
    async logout() {
        const data = await http.post("/auth/logout", undefined, {
            skipAuthRefresh: true,
        })
        return data
    }
}

export default authService

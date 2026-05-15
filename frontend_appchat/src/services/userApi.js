import http from "../config/http.js"

const usersService = {
    async getUsers(){
        const data = await http.get("/users")
        return data
    },
    async createUser(body){
        const data = await http.post("/users",body)
        return data
    }

}

export default usersService

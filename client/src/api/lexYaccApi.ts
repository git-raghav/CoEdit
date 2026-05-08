import axios, { AxiosInstance } from "axios"

const lexYaccBaseUrl = "/lexyacc"

const instance: AxiosInstance = axios.create({
    baseURL: lexYaccBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
})

export default instance

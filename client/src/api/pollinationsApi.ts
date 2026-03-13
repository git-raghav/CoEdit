import axios, { AxiosInstance } from "axios"

const pollinationsBaseUrl = "https://gen.pollinations.ai"

const instance: AxiosInstance = axios.create({
    baseURL: pollinationsBaseUrl,
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_POLLINATIONS_API_KEY}`,
    },
})

export default instance

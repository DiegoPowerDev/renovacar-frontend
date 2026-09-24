import axios from "axios";

export const api = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_API_URL
      : process.env.API_URL,
  withCredentials: true,
  timeout: 10000,
});

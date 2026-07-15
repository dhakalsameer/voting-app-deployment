import { io } from "socket.io-client";
import { API_URL } from "./config";

export const socket = io(API_URL, {
  path: "/socket.io/",
  transports: ["polling"],
  withCredentials: true,
});

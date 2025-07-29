import { io, Socket } from "socket.io-client"

const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000"

export const socket: Socket = io(URL, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
})

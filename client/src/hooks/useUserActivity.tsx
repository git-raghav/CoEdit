import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent, SocketId } from "@/types/socket"
import { RemoteUser, USER_CONNECTION_STATUS, USER_STATUS } from "@/types/user"
import { useCallback, useEffect } from "react"
import { logger } from "@/utils/logger"

function useUserActivity() {
    const { setUsers, status } = useAppContext()
    const { socket } = useSocket()

    const handleUserVisibilityChange = useCallback(() => {
        if (status !== USER_STATUS.JOINED) return
        if (document.visibilityState === "visible") {
            socket.emit(SocketEvent.USER_ONLINE, { socketId: socket.id })
            logger.debug("presence", "visibility online emit", {
                socketId: socket.id,
            })
        }
        // Intentionally avoid emitting USER_OFFLINE on tab hidden.
        // Hidden tab != disconnected user, and this caused collaboration instability.
    }, [socket, status])

    const handleUserOnline = useCallback(
        ({ socketId }: { socketId: SocketId }) => {
            setUsers((users) => {
                return users.map((user) => {
                    if (user.socketId === socketId) {
                        return {
                            ...user,
                            status: USER_CONNECTION_STATUS.ONLINE,
                        }
                    }
                    return user
                })
            })
        },
        [setUsers],
    )

    const handleUserOffline = useCallback(
        ({ socketId }: { socketId: SocketId }) => {
            setUsers((users) => {
                return users.map((user) => {
                    if (user.socketId === socketId) {
                        return {
                            ...user,
                            status: USER_CONNECTION_STATUS.OFFLINE,
                        }
                    }
                    return user
                })
            })
        },
        [setUsers],
    )

    const handleUserTyping = useCallback(
        ({ user }: { user: RemoteUser }) => {
            setUsers((users) => {
                return users.map((u) => {
                    if (u.socketId === user.socketId) {
                        return user
                    }
                    return u
                })
            })
        },
        [setUsers],
    )

    useEffect(() => {
        document.addEventListener(
            "visibilitychange",
            handleUserVisibilityChange,
        )

        socket.on(SocketEvent.USER_ONLINE, handleUserOnline)
        socket.on(SocketEvent.USER_OFFLINE, handleUserOffline)
        socket.on(SocketEvent.TYPING_START, handleUserTyping)
        socket.on(SocketEvent.TYPING_PAUSE, handleUserTyping)

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleUserVisibilityChange,
            )

            socket.off(SocketEvent.USER_ONLINE)
            socket.off(SocketEvent.USER_OFFLINE)
            socket.off(SocketEvent.TYPING_START)
            socket.off(SocketEvent.TYPING_PAUSE)
        }
    }, [
        socket,
        setUsers,
        handleUserVisibilityChange,
        handleUserOnline,
        handleUserOffline,
        handleUserTyping,
    ])
}

export default useUserActivity

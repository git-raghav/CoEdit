import { DrawingData } from "@/types/app"
import {
    SocketContext as SocketContextType,
    SocketEvent,
    SocketId,
} from "@/types/socket"
import { RemoteUser, USER_STATUS, User } from "@/types/user"
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
} from "react"
import { toast } from "react-hot-toast"
import { Socket, io } from "socket.io-client"
import { useAppContext } from "./AppContext"
import { logger } from "@/utils/logger"

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider")
    }
    return context
}

const BACKEND_URL = "https://coderoom.site"
// const BACKEND_URL = "http://localhost:3000"

const SocketProvider = ({ children }: { children: ReactNode }) => {
    const {
        users,
        setUsers,
        setStatus,
        setCurrentUser,
        drawingData,
        setDrawingData,
        setIsOwner,
        setPendingUsers,
        currentUser,
        status,
    } = useAppContext()
    const socket: Socket = useMemo(
        () =>
            io(BACKEND_URL, {
                reconnectionAttempts: 2,
            }),
        [],
    )

    const handleError = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any) => {
            logger.error("socket", "socket error", err)
            setStatus(USER_STATUS.CONNECTION_FAILED)
            toast.dismiss()
            toast.error("Failed to connect to the server")
        },
        [setStatus],
    )

    const handleUsernameExist = useCallback(() => {
        toast.dismiss()
        setStatus(USER_STATUS.INITIAL)
        toast.error(
            "The username you chose already exists in the room. Please choose a different username.",
        )
    }, [setStatus])

    const handleJoiningAccept = useCallback(
        ({
            user,
            users,
            ownerSocketId,
        }: {
            user: User
            users: RemoteUser[]
            ownerSocketId?: SocketId
        }) => {
            setCurrentUser(user)
            setUsers(users)
            toast.dismiss()
            setStatus(USER_STATUS.JOINED)
            logger.info("socket", "join accepted", {
                roomId: user.roomId,
                username: user.username,
                ownerSocketId,
                selfSocketId: socket.id,
            })

            // Server-authoritative ownership (fixes rejoin/refresh edge cases)
            setIsOwner(ownerSocketId === socket.id)

            if (users.length > 1) {
                toast.loading("Syncing data, please wait...")
                // Deterministic sync request (prevents stuck loading toast)
                socket.emit(SocketEvent.REQUEST_SYNC)
            }
        },
        [setCurrentUser, setIsOwner, setStatus, setUsers],
    )

    const handleUserLeft = useCallback(
        ({ user }: { user: User }) => {
            toast.success(`${user.username} left the room`)
            setUsers(users.filter((u: User) => u.username !== user.username))
        },
        [setUsers, users],
    )

    const handleRequestDrawing = useCallback(
        ({ socketId }: { socketId: SocketId }) => {
            socket.emit(SocketEvent.SYNC_DRAWING, { socketId, drawingData })
        },
        [drawingData, socket],
    )

    const handleDrawingSync = useCallback(
        ({ drawingData }: { drawingData: DrawingData }) => {
            setDrawingData(drawingData)
        },
        [setDrawingData],
    )

    const handleJoinPending = useCallback(
        ({
            socketId,
            username,
            roomId,
        }: {
            socketId: SocketId
            username: string
            roomId: string
        }) => {
            // Always store pending requests; if ownership flips shortly after,
            // the new owner will still see admit controls.
            setPendingUsers((prev) => [
                ...prev,
                { socketId, username, roomId },
            ])
            toast.dismiss()
            toast.success(`Join request from ${username}`)
        },
        [setPendingUsers],
    )

    const handleOwnerChanged = useCallback(
        ({ ownerSocketId }: { roomId: string; ownerSocketId: SocketId }) => {
            const nowOwner = ownerSocketId === socket.id
            setIsOwner(nowOwner)
            // Keep pending requests; UI controls depend on isOwner.
            logger.info("socket", "owner changed", {
                ownerSocketId,
                selfSocketId: socket.id,
                nowOwner,
            })
        },
        [setIsOwner, socket.id],
    )

    const handleJoinRejected = useCallback(
        () => {
            toast.dismiss()
            setStatus(USER_STATUS.INITIAL)
            toast.error("Your join request was rejected by the room owner.")
        },
        [setStatus],
    )

    const handleJoinWaiting = useCallback(() => {
        toast.dismiss()
        toast.loading("Waiting for room owner approval...")
    }, [])

    useEffect(() => {
        const handleConnect = () => {
            logger.info("socket", "connected", { socketId: socket.id })
            // Recover collaboration after tab/network reconnects
            if (
                status === USER_STATUS.JOINED &&
                currentUser.username &&
                currentUser.roomId
            ) {
                socket.emit(SocketEvent.JOIN_REQUEST, currentUser)
                logger.info("socket", "rejoin requested after reconnect", {
                    roomId: currentUser.roomId,
                    username: currentUser.username,
                })
            }
        }

        const handleDisconnect = (reason: string) => {
            logger.warn("socket", "disconnected", { reason })
        }

        socket.on("connect", handleConnect)
        socket.on("disconnect", handleDisconnect)
        socket.on("connect_error", handleError)
        socket.on("connect_failed", handleError)
        socket.on(SocketEvent.USERNAME_EXISTS, handleUsernameExist)
        socket.on(SocketEvent.JOIN_ACCEPTED, handleJoiningAccept)
        socket.on(SocketEvent.JOIN_WAITING, handleJoinWaiting)
        socket.on(SocketEvent.JOIN_PENDING, handleJoinPending)
        socket.on(SocketEvent.JOIN_REJECTED, handleJoinRejected)
        socket.on(SocketEvent.OWNER_CHANGED, handleOwnerChanged)
        socket.on(SocketEvent.USER_DISCONNECTED, handleUserLeft)
        socket.on(SocketEvent.REQUEST_DRAWING, handleRequestDrawing)
        socket.on(SocketEvent.SYNC_DRAWING, handleDrawingSync)

        return () => {
            socket.off("connect", handleConnect)
            socket.off("disconnect", handleDisconnect)
            socket.off("connect_error")
            socket.off("connect_failed")
            socket.off(SocketEvent.USERNAME_EXISTS)
            socket.off(SocketEvent.JOIN_ACCEPTED)
            socket.off(SocketEvent.JOIN_WAITING)
            socket.off(SocketEvent.JOIN_PENDING)
            socket.off(SocketEvent.JOIN_REJECTED)
            socket.off(SocketEvent.OWNER_CHANGED)
            socket.off(SocketEvent.USER_DISCONNECTED)
            socket.off(SocketEvent.REQUEST_DRAWING)
            socket.off(SocketEvent.SYNC_DRAWING)
        }
    }, [
        handleDrawingSync,
        handleError,
        handleJoiningAccept,
        handleJoinWaiting,
        handleJoinPending,
        handleJoinRejected,
        handleOwnerChanged,
        handleRequestDrawing,
        handleUserLeft,
        handleUsernameExist,
        currentUser,
        status,
        setUsers,
        socket,
    ])

    return (
        <SocketContext.Provider
            value={{
                socket,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}

export { SocketProvider }
export default SocketContext

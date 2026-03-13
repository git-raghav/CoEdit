import Users from "@/components/common/Users"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import { Share2, Copy, LogOut, Check, X } from "lucide-react"

function UsersView() {
    const navigate = useNavigate()
    const { viewHeight } = useResponsive()
    const { setStatus, isOwner, pendingUsers, setPendingUsers } = useAppContext()
    const { socket } = useSocket()

    const copyURL = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            toast.success("URL copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy URL to clipboard")
            console.log(error)
        }
    }

    const shareURL = async () => {
        const url = window.location.href
        try {
            await navigator.share({ url })
        } catch (error) {
            toast.error("Unable to share URL")
            console.log(error)
        }
    }

    const leaveRoom = () => {
        socket.disconnect()
        setStatus(USER_STATUS.DISCONNECTED)
        navigate("/", {
            replace: true,
        })
    }

    return (
        <div className="flex flex-col p-3" style={{ height: viewHeight }}>
            <h1 className="view-title text-base">Users</h1>
            {/* List of connected users */}
            <Users />
            {isOwner && pendingUsers.length > 0 && (
                <div className="mt-4 w-full">
                    <h2 className="mb-2 text-sm font-semibold text-gray-300">
                        Pending join requests
                    </h2>
                    <div className="flex flex-col gap-2">
                        {pendingUsers.map((pending) => (
                            <div
                                key={pending.socketId}
                                className="flex items-center justify-between rounded-md bg-dark px-3 py-2 text-sm"
                            >
                                <span>{pending.username}</span>
                                <div className="flex gap-2">
                                    <button
                                        className="flex items-center justify-center rounded-md bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                                        onClick={() => {
                                            socket.emit(
                                                SocketEvent.JOIN_APPROVE,
                                                { socketId: pending.socketId },
                                            )
                                            setPendingUsers((prev) =>
                                                prev.filter(
                                                    (p) =>
                                                        p.socketId !==
                                                        pending.socketId,
                                                ),
                                            )
                                        }}
                                        title="Accept"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        className="flex items-center justify-center rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                                        onClick={() => {
                                            socket.emit(
                                                SocketEvent.JOIN_REJECT,
                                                { socketId: pending.socketId },
                                            )
                                            setPendingUsers((prev) =>
                                                prev.filter(
                                                    (p) =>
                                                        p.socketId !==
                                                        pending.socketId,
                                                ),
                                            )
                                        }}
                                        title="Reject"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex flex-col items-center gap-3 pt-4">
                <div className="flex w-full gap-3">
                    {/* Share URL button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-md p-3 hover:bg-dark"
                        onClick={shareURL}
                        title="Share Link"
                    >
                        <Share2 size={22} />
                    </button>
                    {/* Copy URL button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-md p-3 hover:bg-dark"
                        onClick={copyURL}
                        title="Copy Link"
                    >
                        <Copy size={22} />
                    </button>
                    {/* Leave room button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-md p-3 text-red-500 hover:bg-dark"
                        onClick={leaveRoom}
                        title="Leave room"
                    >
                        <LogOut size={22} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UsersView

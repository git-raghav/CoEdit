import Users from "@/components/common/Users"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { USER_STATUS } from "@/types/user"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"
import { Share2, Copy, LogOut } from 'lucide-react';

function UsersView() {
    const navigate = useNavigate()
    const { viewHeight } = useResponsive()
    const { setStatus } = useAppContext()
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

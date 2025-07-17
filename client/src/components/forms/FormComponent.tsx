import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import { PersonStanding, House, Merge } from "lucide-react"

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()

    const createNewRoomId = () => {
        setCurrentUser({ ...currentUser, roomId: uuidv4() })
        toast.success("Created a new Room Id")
        usernameRef.current?.focus()
    }

    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name
        const value = e.target.value
        setCurrentUser({ ...currentUser, [name]: value })
    }

    const validateForm = () => {
        if (currentUser.username.trim().length === 0) {
            toast.error("Enter your username")
            return false
        } else if (currentUser.roomId.trim().length === 0) {
            toast.error("Enter a room id")
            return false
        } else if (currentUser.roomId.trim().length < 5) {
            toast.error("ROOM Id must be at least 5 characters long")
            return false
        } else if (currentUser.username.trim().length < 3) {
            toast.error("Username must be at least 3 characters long")
            return false
        }
        return true
    }

    const joinRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return
        if (!validateForm()) return
        toast.loading("Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        socket.emit(SocketEvent.JOIN_REQUEST, currentUser)
    }

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser({ ...currentUser, roomId: location.state.roomId })
            if (currentUser.username.length === 0) {
                toast.success("Enter your username")
            }
        }
    }, [currentUser, location.state?.roomId, setCurrentUser])

    useEffect(() => {
        if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
            socket.connect()
            return
        }

        const isRedirect = sessionStorage.getItem("redirect") || false

        if (status === USER_STATUS.JOINED && !isRedirect) {
            const username = currentUser.username
            sessionStorage.setItem("redirect", "true")
            navigate(`/editor/${currentUser.roomId}`, {
                state: {
                    username,
                },
            })
        } else if (status === USER_STATUS.JOINED && isRedirect) {
            sessionStorage.removeItem("redirect")
            setStatus(USER_STATUS.DISCONNECTED)
            socket.disconnect()
            socket.connect()
        }
    }, [
        currentUser,
        location.state?.redirect,
        navigate,
        setStatus,
        socket,
        status,
    ])

    return (
        <div className="flex w-full max-w-[500px] flex-col items-center justify-center gap-4 p-4 sm:w-[500px] sm:p-8">
            <h2 className="mb-5 bg-text-gradient bg-clip-text font-mars text-3xl font-bold text-transparent">
                CoEdit
            </h2>
            <form onSubmit={joinRoom} className="flex w-full flex-col gap-4">
                <div className="flex w-full items-center rounded-lg border border-white/10 bg-[#09090b] px-2 py-2 text-[15px] text-white/60 transition-all duration-150 ease-in-out focus-within:ring-2 focus-within:ring-gray-700 focus-within:ring-offset-2 focus-within:ring-offset-[#09090b]">
                    <input
                        placeholder="Room Id"
                        type="text"
                        name="roomId"
                        className="w-full rounded-l-lg bg-transparent px-3 py-1 text-[#f4f4f5] focus:outline-none"
                        onChange={handleInputChanges}
                        value={currentUser.roomId}
                    />
                    <House />
                </div>
                <div className="flex w-full items-center rounded-lg border border-white/10 bg-[#09090b] px-2 py-2 text-[15px] text-white/60 transition-all duration-150 ease-in-out focus-within:ring-2 focus-within:ring-gray-700 focus-within:ring-offset-2 focus-within:ring-offset-[#09090b]">
                    <input
                        placeholder="Username"
                        type="text"
                        name="username"
                        className="w-full rounded-l-lg bg-transparent px-3 py-1 text-[#f4f4f5] focus:outline-none"
                        onChange={handleInputChanges}
                        value={currentUser.username}
                        ref={usernameRef}
                    />
                    <PersonStanding size={30} />
                </div>
                <div className="group relative inline-flex items-center justify-center gap-4 mt-4 mb-2">
                    <div className="transitiona-all absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400 opacity-60 blur-lg filter duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                    <button
                        role="button"
                        className="group relative inline-flex items-center justify-center rounded-xl px-8 py-3 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover: hover:shadow-lg hover:shadow-gray-600/30 w-full font-light"
                        type="submit"
                    >
                        Join
                        <Merge size={18} className="ml-1" />
                    </button>
                </div>
            </form>
            <button
                className="cursor-pointer select-none underline"
                onClick={createNewRoomId}
            >
                Generate Unique Room Id
            </button>
        </div>
    )
}

export default FormComponent

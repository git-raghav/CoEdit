import { useEffect, useRef, useState } from "react"
import { Mic, MicOff, Phone, PhoneOff, Users } from "lucide-react"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import useResponsive from "@/hooks/useResponsive"

interface VoiceUser {
    username: string
    isMuted: boolean
    isSpeaking: boolean
    stream?: MediaStream
}

const VoiceChannel = () => {
    const [isMuted, setIsMuted] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([])
    const [isInVoice, setIsInVoice] = useState(false)
    const localStreamRef = useRef<MediaStream | null>(null)
    const { currentUser } = useAppContext()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()

    useEffect(() => {
        // Handle incoming voice streams
        socket.on(SocketEvent.VOICE_STREAM, ({ username, stream }) => {
            setVoiceUsers((prev) => {
                const existingUser = prev.find((u) => u.username === username)
                if (existingUser) {
                    return prev.map((u) =>
                        u.username === username ? { ...u, stream } : u,
                    )
                }
                return [
                    ...prev,
                    { username, isMuted: false, isSpeaking: false, stream },
                ]
            })
        })

        // Handle user joining voice
        socket.on(SocketEvent.VOICE_JOIN, ({ username }) => {
            setVoiceUsers((prev) => {
                if (!prev.find((u) => u.username === username)) {
                    return [
                        ...prev,
                        { username, isMuted: false, isSpeaking: false },
                    ]
                }
                return prev
            })
        })

        // Handle user leaving voice
        socket.on(SocketEvent.VOICE_LEAVE, ({ username }) => {
            setVoiceUsers((prev) => prev.filter((u) => u.username !== username))
        })

        // Handle mute status changes
        socket.on(SocketEvent.VOICE_MUTE, ({ username, isMuted }) => {
            setVoiceUsers((prev) =>
                prev.map((u) =>
                    u.username === username ? { ...u, isMuted } : u,
                ),
            )
        })

        return () => {
            socket.off(SocketEvent.VOICE_STREAM)
            socket.off(SocketEvent.VOICE_JOIN)
            socket.off(SocketEvent.VOICE_LEAVE)
            socket.off(SocketEvent.VOICE_MUTE)
        }
    }, [socket])

    const joinVoiceChannel = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            localStreamRef.current = stream
            setIsInVoice(true)
            socket.emit(SocketEvent.VOICE_JOIN, {
                username: currentUser.username,
            })

            // Create audio element for local stream
            const audioElement = new Audio()
            audioElement.srcObject = stream
            audioElement.play()
        } catch (error) {
            console.error("Error accessing microphone:", error)
        }
    }

    const leaveVoiceChannel = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
            localStreamRef.current = null
        }
        setIsInVoice(false)
        setIsMuted(false)
        setIsSpeaking(false)
        socket.emit(SocketEvent.VOICE_LEAVE, { username: currentUser.username })
    }

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            audioTrack.enabled = !audioTrack.enabled
            setIsMuted(!isMuted)
            socket.emit(SocketEvent.VOICE_MUTE, {
                username: currentUser.username,
                isMuted: !isMuted,
            })
        }
    }

    return (
        <div className="flex h-full flex-col bg-dark2 p-4" style={{ height: viewHeight }}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Users className="h-5 w-5" />
                    Voice Channel
                </h2>
                {!isInVoice ? (
                    <button
                        onClick={joinVoiceChannel}
                        className="rounded-full bg-green-600 p-2 transition-colors hover:bg-green-700"
                    >
                        <Phone className="h-5 w-5" />
                    </button>
                ) : (
                    <button
                        onClick={leaveVoiceChannel}
                        className="rounded-full bg-red-600 p-2 transition-colors hover:bg-red-700"
                    >
                        <PhoneOff className="h-5 w-5" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {voiceUsers.map((user) => (
                    <div
                        key={user.username}
                        className="mb-2 flex items-center justify-between rounded-lg bg-dark3 p-2"
                    >
                        <span className="flex items-center gap-2">
                            {user.isMuted ? (
                                <MicOff className="h-4 w-4 text-red-500" />
                            ) : (
                                <Mic className="h-4 w-4 text-green-500" />
                            )}
                            {user.username}
                        </span>
                        {user.isSpeaking && (
                            <span className="text-xs text-green-500">
                                Speaking
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {isInVoice && (
                <div className="mt-4 flex justify-center">
                    <button
                        onClick={toggleMute}
                        className={`rounded-full p-3 ${
                            isMuted
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-blue-600 hover:bg-blue-700"
                        } transition-colors`}
                    >
                        {isMuted ? (
                            <MicOff className="h-5 w-5" />
                        ) : (
                            <Mic className="h-5 w-5" />
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

export default VoiceChannel

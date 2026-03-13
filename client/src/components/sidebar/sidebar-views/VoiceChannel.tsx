import { useEffect, useRef, useState } from "react"
import { Mic, MicOff, Phone, PhoneOff, Users } from "lucide-react"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent, SocketId } from "@/types/socket"
import useResponsive from "@/hooks/useResponsive"

interface VoiceUser {
    username: string
    socketId: SocketId
    isMuted: boolean
    isSpeaking: boolean
    stream?: MediaStream
}

const STUN_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
    ],
}

const VoiceChannel = () => {
    const [isMuted, setIsMuted] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([])
    const [isInVoice, setIsInVoice] = useState(false)
    const localStreamRef = useRef<MediaStream | null>(null)
    const peerConnectionsRef = useRef<Map<SocketId, RTCPeerConnection>>(
        new Map(),
    )
    const { currentUser } = useAppContext()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()

    const addRemoteStream = (socketId: SocketId, username: string, stream: MediaStream) => {
        setVoiceUsers((prev) => {
            const existingUser = prev.find((u) => u.socketId === socketId)
            if (existingUser) {
                return prev.map((u) =>
                    u.socketId === socketId ? { ...u, stream } : u,
                )
            }
            return [
                ...prev,
                {
                    username,
                    socketId,
                    isMuted: false,
                    isSpeaking: false,
                    stream,
                },
            ]
        })
    }

    const createPeerConnection = (
        remoteSocketId: SocketId,
        remoteUsername: string,
    ): RTCPeerConnection => {
        let pc = peerConnectionsRef.current.get(remoteSocketId)
        if (pc) return pc

        pc = new RTCPeerConnection(STUN_SERVERS)

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit(SocketEvent.VOICE_ICE_CANDIDATE, {
                    to: remoteSocketId,
                    from: socket.id,
                    candidate: event.candidate,
                })
            }
        }

        pc.ontrack = (event) => {
            const [stream] = event.streams
            if (stream) {
                addRemoteStream(remoteSocketId, remoteUsername, stream)
            }
        }

        const localStream = localStreamRef.current
        if (localStream) {
            localStream.getAudioTracks().forEach((track) => {
                pc?.addTrack(track, localStream)
            })
        }

        peerConnectionsRef.current.set(remoteSocketId, pc)
        return pc
    }

    useEffect(() => {
        // Handle user joining voice
        socket.on(
            SocketEvent.VOICE_JOIN,
            ({ username, socketId }: { username: string; socketId: SocketId }) => {
                setVoiceUsers((prev) => {
                    if (prev.find((u) => u.socketId === socketId)) {
                        return prev
                    }
                    return [
                        ...prev,
                        {
                            username,
                            socketId,
                            isMuted: false,
                            isSpeaking: false,
                        },
                    ]
                })

                // If we are already in voice, initiate a WebRTC connection to the new user
                if (isInVoice && localStreamRef.current) {
                    const pc = createPeerConnection(socketId, username)
                    pc.createOffer()
                        .then((offer) => {
                            return pc.setLocalDescription(offer).then(() => offer)
                        })
                        .then((offer) => {
                            socket.emit(SocketEvent.VOICE_OFFER, {
                                to: socketId,
                                from: socket.id,
                                sdp: offer,
                            })
                        })
                        .catch((err) =>
                            console.error("Error creating voice offer:", err),
                        )
                }
            },
        )

        // Handle user leaving voice
        socket.on(
            SocketEvent.VOICE_LEAVE,
            ({ socketId }: { socketId: SocketId }) => {
                setVoiceUsers((prev) =>
                    prev.filter((u) => u.socketId !== socketId),
                )
                const pc = peerConnectionsRef.current.get(socketId)
                if (pc) {
                    pc.close()
                    peerConnectionsRef.current.delete(socketId)
                }
            },
        )

        // Handle mute status changes
        socket.on(
            SocketEvent.VOICE_MUTE,
            ({
                username,
                isMuted,
                socketId,
            }: {
                username: string
                isMuted: boolean
                socketId: SocketId
            }) => {
                setVoiceUsers((prev) =>
                    prev.map((u) =>
                        u.socketId === socketId || u.username === username
                            ? { ...u, isMuted }
                            : u,
                    ),
                )
            },
        )

        // Handle WebRTC offer
        socket.on(
            SocketEvent.VOICE_OFFER,
            async ({
                from,
                sdp,
            }: {
                from: SocketId
                sdp: RTCSessionDescriptionInit
            }) => {
                if (!localStreamRef.current) return
                const remoteUser =
                    voiceUsers.find((u) => u.socketId === from) || null
                const username = remoteUser?.username || "Unknown"
                const pc = createPeerConnection(from, username)
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp))
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    socket.emit(SocketEvent.VOICE_ANSWER, {
                        to: from,
                        from: socket.id,
                        sdp: answer,
                    })
                } catch (err) {
                    console.error("Error handling voice offer:", err)
                }
            },
        )

        // Handle WebRTC answer
        socket.on(
            SocketEvent.VOICE_ANSWER,
            async ({
                from,
                sdp,
            }: {
                from: SocketId
                sdp: RTCSessionDescriptionInit
            }) => {
                const pc = peerConnectionsRef.current.get(from)
                if (!pc) return
                try {
                    await pc.setRemoteDescription(
                        new RTCSessionDescription(sdp),
                    )
                } catch (err) {
                    console.error("Error handling voice answer:", err)
                }
            },
        )

        // Handle ICE candidates
        socket.on(
            SocketEvent.VOICE_ICE_CANDIDATE,
            async ({
                from,
                candidate,
            }: {
                from: SocketId
                candidate: RTCIceCandidateInit
            }) => {
                const pc = peerConnectionsRef.current.get(from)
                if (!pc) return
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (err) {
                    console.error("Error adding ICE candidate:", err)
                }
            },
        )

        return () => {
            socket.off(SocketEvent.VOICE_JOIN)
            socket.off(SocketEvent.VOICE_LEAVE)
            socket.off(SocketEvent.VOICE_MUTE)
            socket.off(SocketEvent.VOICE_OFFER)
            socket.off(SocketEvent.VOICE_ANSWER)
            socket.off(SocketEvent.VOICE_ICE_CANDIDATE)
        }
    }, [isInVoice, socket, voiceUsers])

    const joinVoiceChannel = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            localStreamRef.current = stream
            setIsInVoice(true)
            setVoiceUsers((prev) => {
                const selfEntry = prev.find(
                    (u) => u.socketId === socket.id,
                )
                if (selfEntry) {
                    return prev
                }
                return [
                    ...prev,
                    {
                        username: currentUser.username,
                        socketId: socket.id as SocketId,
                        isMuted: false,
                        isSpeaking: false,
                        stream,
                    },
                ]
            })
            socket.emit(SocketEvent.VOICE_JOIN, {
                username: currentUser.username,
            })

            // Play local stream
            const audioElement = new Audio()
            audioElement.srcObject = stream
            audioElement.muted = true
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

        peerConnectionsRef.current.forEach((pc) => pc.close())
        peerConnectionsRef.current.clear()

        setIsInVoice(false)
        setIsMuted(false)
        setIsSpeaking(false)
        setVoiceUsers((prev) =>
            prev.filter((u) => u.socketId !== socket.id),
        )
        socket.emit(SocketEvent.VOICE_LEAVE, {
            username: currentUser.username,
        })
    }

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0]
            audioTrack.enabled = !audioTrack.enabled
            const nextMuted = !isMuted
            setIsMuted(nextMuted)
            // Update local entry in the voice users list so our own icon reflects mute state
            setVoiceUsers((prev) =>
                prev.map((u) =>
                    u.socketId === (socket.id as SocketId)
                        ? { ...u, isMuted: nextMuted }
                        : u,
                ),
            )
            socket.emit(SocketEvent.VOICE_MUTE, {
                username: currentUser.username,
                isMuted: nextMuted,
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
                        key={user.socketId}
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
                        {/* Hidden audio element for remote streams */}
                        {user.stream && (
                            <audio
                                autoPlay
                                ref={(audio) => {
                                    if (audio) {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        ;(audio as any).srcObject = user.stream
                                    }
                                }}
                                className="hidden"
                            />
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

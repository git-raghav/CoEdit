import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { logger } from "@/utils/logger"
import { SocketEvent, SocketId } from "@/types/socket"
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

interface VoiceUser {
    username: string
    socketId: SocketId
    isMuted: boolean
    isSpeaking: boolean
    stream?: MediaStream
}

interface VoiceContextType {
    isInVoice: boolean
    isMuted: boolean
    voiceUsers: VoiceUser[]
    joinVoiceChannel: () => Promise<void>
    leaveVoiceChannel: () => void
    toggleMute: () => void
}

const VoiceContext = createContext<VoiceContextType | null>(null)

const STUN_SERVERS: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

export const useVoice = (): VoiceContextType => {
    const ctx = useContext(VoiceContext)
    if (!ctx) throw new Error("useVoice must be used within VoiceContextProvider")
    return ctx
}

export function VoiceContextProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAppContext()
    const { socket } = useSocket()
    const [isMuted, setIsMuted] = useState(false)
    const [isInVoice, setIsInVoice] = useState(false)
    const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([])

    const localStreamRef = useRef<MediaStream | null>(null)
    const peerConnectionsRef = useRef<Map<SocketId, RTCPeerConnection>>(new Map())
    const isInVoiceRef = useRef(false)

    useEffect(() => {
        isInVoiceRef.current = isInVoice
    }, [isInVoice])

    const upsertVoiceUser = useCallback((partial: Partial<VoiceUser> & Pick<VoiceUser, "socketId" | "username">) => {
        setVoiceUsers((prev) => {
            const existing = prev.find((u) => u.socketId === partial.socketId)
            if (!existing) {
                // Username is unique in room; replace stale entry from old socket on refresh/rejoin.
                const withoutStaleSameUsername = prev.filter(
                    (u) => u.username !== partial.username,
                )
                return [
                    ...withoutStaleSameUsername,
                    {
                        username: partial.username,
                        socketId: partial.socketId,
                        isMuted: partial.isMuted ?? false,
                        isSpeaking: partial.isSpeaking ?? false,
                        stream: partial.stream,
                    },
                ]
            }
            return prev.map((u) =>
                u.socketId === partial.socketId
                    ? {
                        ...u,
                        ...partial,
                    }
                    : u,
            )
        })
    }, [])

    const createPeerConnection = useCallback(
        (remoteSocketId: SocketId, remoteUsername: string): RTCPeerConnection => {
            const existingPc = peerConnectionsRef.current.get(remoteSocketId)
            if (existingPc) return existingPc

            const pc = new RTCPeerConnection(STUN_SERVERS)

            pc.onicecandidate = (event) => {
                if (!event.candidate) return
                socket.emit(SocketEvent.VOICE_ICE_CANDIDATE, {
                    to: remoteSocketId,
                    from: socket.id,
                    candidate: event.candidate,
                })
            }

            pc.ontrack = (event) => {
                const [stream] = event.streams
                if (!stream) return
                upsertVoiceUser({
                    socketId: remoteSocketId,
                    username: remoteUsername,
                    stream,
                })
            }

            const localStream = localStreamRef.current
            if (localStream) {
                localStream.getAudioTracks().forEach((track) => {
                    pc.addTrack(track, localStream)
                })
            }

            peerConnectionsRef.current.set(remoteSocketId, pc)
            return pc
        },
        [socket, upsertVoiceUser],
    )

    const cleanupVoiceState = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
            localStreamRef.current = null
        }
        peerConnectionsRef.current.forEach((pc) => pc.close())
        peerConnectionsRef.current.clear()
        setIsInVoice(false)
        setIsMuted(false)
        setVoiceUsers((prev) => prev.filter((u) => u.socketId !== socket.id))
    }, [socket.id])

    useEffect(() => {
        const onVoiceJoin = ({ username, socketId }: { username: string; socketId: SocketId }) => {
            upsertVoiceUser({ socketId, username })

            if (isInVoiceRef.current && localStreamRef.current) {
                const pc = createPeerConnection(socketId, username)
                pc.createOffer()
                    .then((offer) => pc.setLocalDescription(offer).then(() => offer))
                    .then((offer) => {
                        socket.emit(SocketEvent.VOICE_OFFER, {
                            to: socketId,
                            from: socket.id,
                            sdp: offer,
                        })
                    })
                    .catch((err) => logger.error("voice", "create offer failed", err))
            }
        }

        const onVoiceLeave = ({ socketId }: { socketId: SocketId }) => {
            setVoiceUsers((prev) => prev.filter((u) => u.socketId !== socketId))
            const pc = peerConnectionsRef.current.get(socketId)
            if (pc) {
                pc.close()
                peerConnectionsRef.current.delete(socketId)
            }
        }

        const onVoiceMute = ({
            username,
            isMuted,
            socketId,
        }: {
            username: string
            isMuted: boolean
            socketId: SocketId
        }) => {
            upsertVoiceUser({ socketId, username, isMuted })
        }

        const onVoiceOffer = async ({
            from,
            sdp,
        }: {
            from: SocketId
            sdp: RTCSessionDescriptionInit
        }) => {
            if (!localStreamRef.current) return
            const knownUser = voiceUsers.find((u) => u.socketId === from)
            const username = knownUser?.username || "Unknown"
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
                logger.error("voice", "handle offer failed", err)
            }
        }

        const onVoiceAnswer = async ({
            from,
            sdp,
        }: {
            from: SocketId
            sdp: RTCSessionDescriptionInit
        }) => {
            const pc = peerConnectionsRef.current.get(from)
            if (!pc) return
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            } catch (err) {
                logger.error("voice", "handle answer failed", err)
            }
        }

        const onVoiceIceCandidate = async ({
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
                logger.error("voice", "add ice candidate failed", err)
            }
        }

        socket.on(SocketEvent.VOICE_JOIN, onVoiceJoin)
        socket.on(SocketEvent.VOICE_LEAVE, onVoiceLeave)
        socket.on(SocketEvent.VOICE_MUTE, onVoiceMute)
        socket.on(SocketEvent.VOICE_OFFER, onVoiceOffer)
        socket.on(SocketEvent.VOICE_ANSWER, onVoiceAnswer)
        socket.on(SocketEvent.VOICE_ICE_CANDIDATE, onVoiceIceCandidate)
        socket.on("disconnect", cleanupVoiceState)

        return () => {
            socket.off(SocketEvent.VOICE_JOIN, onVoiceJoin)
            socket.off(SocketEvent.VOICE_LEAVE, onVoiceLeave)
            socket.off(SocketEvent.VOICE_MUTE, onVoiceMute)
            socket.off(SocketEvent.VOICE_OFFER, onVoiceOffer)
            socket.off(SocketEvent.VOICE_ANSWER, onVoiceAnswer)
            socket.off(SocketEvent.VOICE_ICE_CANDIDATE, onVoiceIceCandidate)
            socket.off("disconnect", cleanupVoiceState)
        }
    }, [cleanupVoiceState, createPeerConnection, socket, upsertVoiceUser, voiceUsers])

    const joinVoiceChannel = useCallback(async () => {
        try {
            if (!navigator?.mediaDevices?.getUserMedia) {
                logger.warn(
                    "voice",
                    "microphone api unavailable (requires HTTPS or localhost)",
                )
                return
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            localStreamRef.current = stream
            setIsInVoice(true)
            upsertVoiceUser({
                username: currentUser.username,
                socketId: socket.id as SocketId,
                isMuted: false,
                stream,
            })
            socket.emit(SocketEvent.VOICE_JOIN, {
                username: currentUser.username,
            })

            const audioElement = new Audio()
            audioElement.srcObject = stream
            audioElement.muted = true
            void audioElement.play()
        } catch (err) {
            logger.error("voice", "join voice failed", err)
        }
    }, [currentUser.username, socket, upsertVoiceUser])

    const leaveVoiceChannel = useCallback(() => {
        cleanupVoiceState()
        socket.emit(SocketEvent.VOICE_LEAVE, {
            username: currentUser.username,
        })
    }, [cleanupVoiceState, currentUser.username, socket])

    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (!audioTrack) return
        audioTrack.enabled = !audioTrack.enabled
        const nextMuted = !isMuted
        setIsMuted(nextMuted)
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
    }, [currentUser.username, isMuted, socket])

    const value = useMemo(
        () => ({
            isInVoice,
            isMuted,
            voiceUsers,
            joinVoiceChannel,
            leaveVoiceChannel,
            toggleMute,
        }),
        [isInVoice, isMuted, joinVoiceChannel, leaveVoiceChannel, toggleMute, voiceUsers],
    )

    return (
        <VoiceContext.Provider value={value}>
            {children}
            {/* Keep remote audio playback mounted globally so voice continues across view switches */}
            <div className="hidden">
                {voiceUsers.map((user) => (
                    user.stream && user.socketId !== (socket.id as SocketId) ? (
                        <audio
                            key={user.socketId}
                            autoPlay
                            ref={(audio) => {
                                if (audio) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    ;(audio as any).srcObject = user.stream
                                }
                            }}
                        />
                    ) : null
                ))}
            </div>
        </VoiceContext.Provider>
    )
}


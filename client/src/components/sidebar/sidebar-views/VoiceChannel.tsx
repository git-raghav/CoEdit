import { Mic, MicOff, Phone, PhoneOff, Users } from "lucide-react"
// import { useSocket } from "@/context/SocketContext"
import { useVoice } from "@/context/VoiceContext"
// import { SocketId } from "@/types/socket"
import useResponsive from "@/hooks/useResponsive"

const VoiceChannel = () => {
    const {
        isMuted,
        voiceUsers,
        isInVoice,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
    } = useVoice()
    // const { socket } = useSocket()
    const { viewHeight } = useResponsive()

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

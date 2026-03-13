import { StoreSnapshot, TLRecord } from "@tldraw/tldraw"
import { RemoteUser, User, USER_STATUS } from "./user"

type DrawingData = StoreSnapshot<TLRecord> | null

enum ACTIVITY_STATE {
    CODING = "coding",
    DRAWING = "drawing",
}

interface PendingUser {
    socketId: string
    username: string
    roomId: string
}

interface AppContext {
    users: RemoteUser[]
    setUsers: (
        users: RemoteUser[] | ((users: RemoteUser[]) => RemoteUser[]),
    ) => void
    currentUser: User
    setCurrentUser: (user: User) => void
    status: USER_STATUS
    setStatus: (status: USER_STATUS) => void
    activityState: ACTIVITY_STATE
    setActivityState: (state: ACTIVITY_STATE) => void
    drawingData: DrawingData
    setDrawingData: (data: DrawingData) => void
    isOwner: boolean
    setIsOwner: (isOwner: boolean) => void
    pendingUsers: PendingUser[]
    setPendingUsers: (
        users: PendingUser[] | ((users: PendingUser[]) => PendingUser[]),
    ) => void
}

export { ACTIVITY_STATE }
export { AppContext, DrawingData }

import ChatsView from "@/components/sidebar/sidebar-views/ChatsView"
import CopilotView from "@/components/sidebar/sidebar-views/CopilotView"
import FilesView from "@/components/sidebar/sidebar-views/FilesView"
import RunView from "@/components/sidebar/sidebar-views/RunView"
import SettingsView from "@/components/sidebar/sidebar-views/SettingsView"
import UsersView from "@/components/sidebar/sidebar-views/UsersView"
import VoiceChannel from "@/components/sidebar/sidebar-views/VoiceChannel"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { VIEWS, ViewContext as ViewContextType } from "@/types/view"
import { ReactNode, createContext, useContext, useState } from "react"
import { Mic, Files, Users, Settings, MessagesSquare, Play, BotMessageSquare } from "lucide-react"

const ViewContext = createContext<ViewContextType | null>(null)

export const useViews = (): ViewContextType => {
    const context = useContext(ViewContext)
    if (!context) {
        throw new Error("useViews must be used within a ViewContextProvider")
    }
    return context
}

function ViewContextProvider({ children }: { children: ReactNode }) {
    const { isMobile } = useWindowDimensions()
    const [activeView, setActiveView] = useState<VIEWS>(VIEWS.FILES)
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isMobile)
    const [viewComponents] = useState({
        [VIEWS.FILES]: <FilesView />,
        [VIEWS.CLIENTS]: <UsersView />,
        [VIEWS.SETTINGS]: <SettingsView />,
        [VIEWS.COPILOT]: <CopilotView />,
        [VIEWS.CHATS]: <ChatsView />,
        [VIEWS.RUN]: <RunView />,
        [VIEWS.VOICE]: <VoiceChannel />,
    })
    const [viewIcons] = useState({
        [VIEWS.FILES]: <Files size={25} />,
        [VIEWS.CLIENTS]: <Users size={25} />,
        [VIEWS.SETTINGS]: <Settings size={25} />,
        [VIEWS.CHATS]: <MessagesSquare size={25} />,
        [VIEWS.COPILOT]: <BotMessageSquare size={25} />,
        [VIEWS.RUN]: <Play size={25} />,
        [VIEWS.VOICE]: <Mic size={25} />,
    })

    return (
        <ViewContext.Provider
            value={{
                activeView,
                setActiveView,
                isSidebarOpen,
                setIsSidebarOpen,
                viewComponents,
                viewIcons,
            }}
        >
            {children}
        </ViewContext.Provider>
    )
}

export { ViewContextProvider }
export default ViewContext

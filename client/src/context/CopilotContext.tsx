import { ICopilotContext } from "@/types/copilot"
import { createContext, ReactNode, useContext, useState } from "react"
import toast from "react-hot-toast"
import axiosInstance from "../api/pollinationsApi"

export const CopilotContext = createContext<ICopilotContext | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useCopilot = () => {
    const context = useContext(CopilotContext)
    if (context === null) {
        throw new Error(
            "useCopilot must be used within a CopilotContextProvider",
        )
    }
    return context
}

export const CopilotContextProvider = ({
    children,
}: {
    children: ReactNode
}) => {
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)

    const generateCode = async () => {
        try {
            if (!input.trim()) {
                toast.error("Please write a prompt")
                return
            }

            toast.loading("Generating code...")
            setIsRunning(true)

            const response = await axiosInstance.post("/v1/chat/completions", {
                messages: [
                    {
                        role: "system",
                        content: `
            You are Raghav's copilot, an AI assistant for a collaborative development platform called CodeRoom.

            Your primary job is to write **clean, production-ready code** in response to user prompts. Respond with only the code block formatted in Markdown, using the appropriate language tag (e.g., \`\`\`js, \`\`\`py, etc.). **Do not explain anything** unless the user explicitly asks for "chat", "explanation", or "conversation".

            If the prompt includes keywords like "explain", "describe", "what is", or "chat with me", you may respond conversationally.

            Always optimize code for:
            - Best practices
            - Clean formatting
            - Readability
            - Performance (where relevant)

            Example format:
            \`\`\`language
            // your code here
            \`\`\`
                        `.trim(),
                    },
                    {
                        role: "user",
                        content: input,
                    },
                ],
                model: "mistral",
                private: true,
            })

            if (response.data) {
                toast.success("Code generated successfully")
                const code = response.data.choices[0].message.content
                if (code) setOutput(code)
            }
            setIsRunning(false)
            toast.dismiss()
        } catch (error) {
            console.error(error)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to generate the code")
        }
    }

    return (
        <CopilotContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                generateCode,
            }}
        >
            {children}
        </CopilotContext.Provider>
    )
}

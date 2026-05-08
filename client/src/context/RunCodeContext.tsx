import axiosInstance from "@/api/pistonApi"
import lexYaccApi from "@/api/lexYaccApi"
import { Language, RunContext as RunContextType } from "@/types/run"
import langMap from "lang-map"
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"
import { logger } from "@/utils/logger"

const RunCodeContext = createContext<RunContextType | null>(null)

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
    }
    return context
}

const RunCodeContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: "",
        version: "",
        aliases: [],
    })
    const [lexCode, setLexCode] = useState<string>("")
    const [yaccCode, setYaccCode] = useState<string>("")
    const [lexYaccOutput, setLexYaccOutput] = useState<string>("")
    const [isLexYaccRunning, setIsLexYaccRunning] = useState<boolean>(false)

    useEffect(() => {
        const fetchSupportedLanguages = async () => {
            try {
                const languages = await axiosInstance.get("/runtimes")
                setSupportedLanguages(languages.data)
            } catch (error: any) {
                toast.error("Failed to fetch supported languages")
                if (error?.response?.data) console.error(error?.response?.data)
            }
        }

        fetchSupportedLanguages()
    }, [])

    // Set the selected language based on the file extension
    useEffect(() => {
        if (supportedLanguages.length === 0 || !activeFile?.name) return

        const extension = activeFile.name.split(".").pop()
        if (extension) {
            const languageName = langMap.languages(extension)
            const language = supportedLanguages.find(
                (lang) =>
                    lang.aliases.includes(extension) ||
                    languageName.includes(lang.language.toLowerCase()),
            )
            if (language) setSelectedLanguage(language)
        } else setSelectedLanguage({ language: "", version: "", aliases: [] })
    }, [activeFile?.name, supportedLanguages])

    const runCode = async () => {
        try {
            if (!selectedLanguage) {
                return toast.error("Please select a language to run the code")
            } else if (!activeFile) {
                return toast.error("Please open a file to run the code")
            } else {
                toast.loading("Running code...")
            }

            setIsRunning(true)
            const { language, version } = selectedLanguage

            const response = await axiosInstance.post("/execute", {
                language,
                version,
                files: [{ name: activeFile.name, content: activeFile.content }],
                stdin: input,
                compile_timeout: 20000,
                run_timeout: 10000,
                compile_cpu_time: 20000,
                run_cpu_time: 10000
            })
            logger.info("run", "execution completed", {
                language,
                version,
                status: response.data?.run?.status,
                wall_time: response.data?.run?.wall_time,
            })
            const runResult = response.data.run
            if (runResult.stderr) {
                setOutput(runResult.stderr)
            } else if (runResult.stdout) {
                setOutput(runResult.stdout)
            } else if (runResult.message) {
                setOutput(runResult.message)
            } else {
                setOutput("Execution completed with no output.")
            }
            setIsRunning(false)
            toast.dismiss()
        } catch (error: any) {
            logger.error("run", "execution failed", error?.response?.data || error)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to run the code")
        }
    }

    const runLexYaccCode = async () => {
        try {
            if (!lexCode.trim() || !yaccCode.trim()) {
                return toast.error("Please provide both Lex and Yacc code")
            }

            toast.loading("Running Lex/Yacc code...")
            setIsLexYaccRunning(true)

            const response = await lexYaccApi.post("/execute", {
                lexCode,
                yaccCode,
                stdin: input,
            })

            logger.info("lexyacc", "execution completed", {
                exitCode: response.data?.exitCode,
            })

            const stdout = response.data?.stdout || ""
            const stderr = response.data?.stderr || ""
            const combined = [stdout, stderr].filter(Boolean).join("\n")

            setLexYaccOutput(
                combined || "Execution completed with no output.",
            )
            toast.dismiss()
        } catch (error: any) {
            logger.error("lexyacc", "execution failed", error?.response?.data || error)
            const responseData = error?.response?.data
            const detailedOutput = [
                responseData?.error,
                responseData?.stderr,
                responseData?.stdout,
            ]
                .filter(Boolean)
                .join("\n")
            setLexYaccOutput(detailedOutput || "Failed to run Lex/Yacc code")
            toast.dismiss()
            toast.error("Failed to run Lex/Yacc code")
        } finally {
            setIsLexYaccRunning(false)
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
                lexCode,
                setLexCode,
                yaccCode,
                setYaccCode,
                lexYaccOutput,
                isLexYaccRunning,
                runLexYaccCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }
export default RunCodeContext

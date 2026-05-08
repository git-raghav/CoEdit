import { useRunCode } from "@/context/RunCodeContext"
import useResponsive from "@/hooks/useResponsive"
import { ChangeEvent, useState } from "react"
import toast from "react-hot-toast"
import { ChevronDown, Copy, Play } from 'lucide-react';

function RunView() {
    const { viewHeight } = useResponsive()
    const [mode, setMode] = useState<"piston" | "lexyacc">("piston")
    const {
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
    } = useRunCode()

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const lang = JSON.parse(e.target.value)
        setSelectedLanguage(lang)
    }

    const copyOutput = () => {
        const textToCopy = mode === "piston" ? output : lexYaccOutput
        navigator.clipboard.writeText(textToCopy)
        toast.success("Output copied to clipboard")
    }

    return (
        <div
            className="flex flex-col items-center gap-2 p-3"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title text-base">Run Code</h1>
            <div className="mb-2 flex w-full gap-2">
                <button
                    className={`rounded-lg px-3 py-1 text-sm ${
                        mode === "piston" ? "bg-statuspurple text-black" : "bg-dark text-white"
                    }`}
                    onClick={() => setMode("piston")}
                >
                    Language Runner
                </button>
                <button
                    className={`rounded-lg px-3 py-1 text-sm ${
                        mode === "lexyacc" ? "bg-statuspurple text-black" : "bg-dark text-white"
                    }`}
                    onClick={() => setMode("lexyacc")}
                >
                    Lex/Yacc Runner
                </button>
            </div>
            <div className="flex h-[90%] w-full flex-col items-end gap-2 md:h-[92%]">
                {mode === "piston" && (
                    <div className="relative w-full">
                        <select
                            className="w-full rounded-xl border-none bg-dark px-3 py-2 text-white outline-none"
                            value={JSON.stringify(selectedLanguage)}
                            onChange={handleLanguageChange}
                        >
                            {supportedLanguages
                                .sort((a, b) => (a.language > b.language ? 1 : -1))
                                .map((lang, i) => {
                                    return (
                                        <option
                                            key={i}
                                            value={JSON.stringify(lang)}
                                        >
                                            {lang.language +
                                                (lang.version
                                                    ? ` (${lang.version})`
                                                    : "")}
                                        </option>
                                    )
                                })}
                        </select>
                        <ChevronDown
                            size={19}
                            strokeWidth={2.25}
                            className="absolute bottom-2 right-4 z-10 text-white"
                        />
                    </div>
                )}
                {mode === "lexyacc" && (
                    <>
                        <textarea
                            className="min-h-[120px] w-full resize-none rounded-md border-none bg-dark p-2 text-white outline-none text-sm"
                            placeholder="Paste your Lex code (.l) here..."
                            value={lexCode}
                            onChange={(e) => setLexCode(e.target.value)}
                        />
                        <textarea
                            className="min-h-[120px] w-full resize-none rounded-md border-none bg-dark p-2 text-white outline-none text-sm"
                            placeholder="Paste your Yacc/Bison code (.y) here..."
                            value={yaccCode}
                            onChange={(e) => setYaccCode(e.target.value)}
                        />
                    </>
                )}
                <textarea
                    className="min-h-[120px] w-full resize-none rounded-md border-none bg-dark p-2 text-white outline-none text-sm"
                    placeholder="Write your input here..."
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    className="flex w-full justify-center gap-1 rounded-xl bg-statuspurple p-2 font-medium text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={mode === "piston" ? runCode : runLexYaccCode}
                    disabled={mode === "piston" ? isRunning : isLexYaccRunning}
                >
                    <Play size={18} strokeWidth={2.75} className="pt-1" />
                    Run
                </button>
                <label className="flex w-full justify-between">
                    Output :
                    <button onClick={copyOutput} title="Copy Output">
                        <Copy
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                </label>
                <div className="w-full flex-grow resize-none overflow-y-auto rounded-md border-none bg-dark p-2 pb-10 text-white outline-none">
                    <code>
                        <pre className="text-wrap">
                            {mode === "piston" ? output : lexYaccOutput}
                        </pre>
                    </code>
                </div>
            </div>
        </div>
    )
}

export default RunView

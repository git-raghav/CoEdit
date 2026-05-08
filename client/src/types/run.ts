interface Language {
    language: string
    version: string
    aliases: string[]
}

interface RunContext {
    setInput: (input: string) => void
    output: string
    isRunning: boolean
    supportedLanguages: Language[]
    selectedLanguage: Language
    setSelectedLanguage: (language: Language) => void
    runCode: () => void
    lexCode: string
    setLexCode: (code: string) => void
    yaccCode: string
    setYaccCode: (code: string) => void
    lexYaccOutput: string
    isLexYaccRunning: boolean
    runLexYaccCode: () => void
}

export { Language, RunContext }

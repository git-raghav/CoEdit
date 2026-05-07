type LogLevel = "debug" | "info" | "warn" | "error"

function writeLog(level: LogLevel, scope: string, message: string, meta?: unknown) {
    const payload = {
        ts: new Date().toISOString(),
        level,
        scope,
        message,
        meta: meta ?? null,
    }

    if (level === "error") {
        console.error(payload)
        return
    }
    if (level === "warn") {
        console.warn(payload)
        return
    }
    console.log(payload)
}

export const logger = {
    debug: (scope: string, message: string, meta?: unknown) =>
        writeLog("debug", scope, message, meta),
    info: (scope: string, message: string, meta?: unknown) =>
        writeLog("info", scope, message, meta),
    warn: (scope: string, message: string, meta?: unknown) =>
        writeLog("warn", scope, message, meta),
    error: (scope: string, message: string, meta?: unknown) =>
        writeLog("error", scope, message, meta),
}

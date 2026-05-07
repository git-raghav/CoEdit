import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { SocketEvent } from "@/types/socket"
import { useCallback, useEffect, useRef } from "react"
import { HistoryEntry, RecordsDiff, TLRecord, Tldraw, useEditor } from "tldraw"

function DrawingEditor() {
    const { isMobile } = useWindowDimensions()

    return (
        <Tldraw
            inferDarkMode
            forceMobile={isMobile}
            defaultName="Editor"
            className="z-0"
        >
            <ReachEditor />
        </Tldraw>
    )
}

function ReachEditor() {
    const editor = useEditor()
    const { drawingData, setDrawingData } = useAppContext()
    const { socket } = useSocket()
    const hasLoadedInitialSnapshot = useRef(false)

    const handleChangeEvent = useCallback(
        (change: HistoryEntry<TLRecord>) => {
            const snapshot = change.changes
            // Update the drawing data in the context
            setDrawingData(editor.store.getSnapshot())
            // Emit the snapshot to the server
            socket.emit(SocketEvent.DRAWING_UPDATE, { snapshot })
        },
        [editor.store, setDrawingData, socket],
    )

    // Handle drawing updates from other clients
    const handleRemoteDrawing = useCallback(
        ({ snapshot }: { snapshot: RecordsDiff<TLRecord> }) => {
            editor.store.mergeRemoteChanges(() => {
                const { added, updated, removed } = snapshot

                for (const record of Object.values(added)) {
                    editor.store.put([record])
                }
                for (const [, to] of Object.values(updated)) {
                    editor.store.put([to])
                }
                for (const record of Object.values(removed)) {
                    editor.store.remove([record.id])
                }
            })

            setDrawingData(editor.store.getSnapshot())
        },
        [editor.store, setDrawingData],
    )

    useEffect(() => {
        // Load the initial drawing snapshot once after sync.
        if (
            hasLoadedInitialSnapshot.current ||
            !drawingData ||
            Object.keys(drawingData).length === 0
        ) {
            return
        }
        editor.store.loadSnapshot(drawingData)
        hasLoadedInitialSnapshot.current = true
    }, [drawingData, editor.store])

    useEffect(() => {
        const cleanupFunction = editor.store.listen(handleChangeEvent, {
            source: "user",
            scope: "document",
        })
        // Listen for drawing updates from other clients
        socket.on(SocketEvent.DRAWING_UPDATE, handleRemoteDrawing)

        // Cleanup
        return () => {
            cleanupFunction()
            socket.off(SocketEvent.DRAWING_UPDATE)
        }
    }, [
        drawingData,
        editor.store,
        handleChangeEvent,
        handleRemoteDrawing,
        socket,
    ])

    return null
}

export default DrawingEditor

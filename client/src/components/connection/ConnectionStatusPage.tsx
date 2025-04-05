import { useNavigate } from "react-router-dom"
import { RotateCcw, ArrowLeftToLine } from "lucide-react"

function ConnectionStatusPage() {
    return (
        <div className="flex h-screen min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
            <ConnectionError />
        </div>
    )
}

const ConnectionError = () => {
    const navigate = useNavigate()
    const reloadPage = () => {
        window.location.reload()
    }

    const gotoHomePage = () => {
        navigate("/")
    }

    return (
        <>
            <span className="whitespace-break-spaces text-lg font-medium text-slate-300">
                Oops! Something went wrong. Please try again
            </span>
            <div className="flex flex-wrap justify-center gap-4">
                <div className="group relative mb-2 mt-4 inline-flex items-center justify-center gap-4">
                    <div className="transitiona-all absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400 opacity-60 blur-lg filter duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                    <button
                        role="button"
                        className="hover: group relative inline-flex w-full items-center justify-center rounded-xl px-8 py-3 text-base font-light font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-600/30 font-light"
                        onClick={reloadPage}
                    >
                        Try Again
                        <RotateCcw size={18} className="ml-1" />
                    </button>
                </div>
                <div className="group relative mb-2 mt-4 inline-flex items-center justify-center gap-4">
                    <div className="transitiona-all absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-400 opacity-60 blur-lg filter duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
                    <button
                        role="button"
                        className="hover: group relative inline-flex w-full items-center justify-center rounded-xl px-8 py-3 text-base font-light font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-600/30 font-light"
                        onClick={gotoHomePage}
                    >
                        Go to HomePage
                        <ArrowLeftToLine size={18} className="ml-1" />
                    </button>
                </div>
            </div>
        </>
    )
}

export default ConnectionStatusPage

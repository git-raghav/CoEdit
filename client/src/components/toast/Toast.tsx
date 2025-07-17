import { Toaster } from "react-hot-toast"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

function Toast() {
    return (
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#000", // Pure black background
              color: "#fff", // Pure white text
              fontWeight: "250",
              fontSize: "0.875rem",
              letterSpacing: "0.03em",
              borderRadius: "8px",
              padding: "14px 18px",
              boxShadow: "0px 4px 12px rgba(255, 255, 255, 0.1)", // Soft white glow
              border: "1px solid rgba(255, 255, 255, 0.1)",
            },
            success: {
              icon: <CheckCircle size={20} color="#4ade80" />,
            },
            error: {
              icon: <XCircle size={20} color="#f87171" />,
            },
            loading: {
              icon: <Loader2 size={20} color="#3b82f6" className="animate-spin" />,
            },
          }}
        />
      );
}

export default Toast

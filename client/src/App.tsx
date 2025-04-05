// import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
// import Toast from "./components/toast/Toast"
// import EditorPage from "./pages/EditorPage"
// import HomePage from "./pages/HomePage"

// const App = () => {
//     return (
//         <>
//             <Router>
//                 <Routes>
//                     <Route path="/" element={<HomePage />} />
//                     <Route path="/editor/:roomId" element={<EditorPage />} />
//                 </Routes>
//             </Router>
//             <Toast />
//         </>
//     )
// }

// export default App
import { useState, useEffect } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import HomePage from "./pages/HomePage";
import Toast from "./components/toast/Toast"
import Loader from "./components/loader/Loader"; // Import the Loader component
import { motion, AnimatePresence } from "framer-motion";

const App = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loader"
                        className="flex h-screen items-center justify-center bg-dark2"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                        <Loader />
                    </motion.div>
                ) : (
                    <motion.div
                        key="homepage"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                        <Router>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route
                                    path="/editor/:roomId"
                                    element={<EditorPage />}
                                />
                                <Route
                                    path="/"
                                    element={<EditorPage />}
                                />
                            </Routes>
                        </Router>
                    </motion.div>
                )}
            </AnimatePresence>
            <Toast />
        </>
    );
};

export default App;

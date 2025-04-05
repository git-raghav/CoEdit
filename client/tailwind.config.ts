/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{jsx,tsx}", "./*.html"],
    theme: {
        extend: {
            colors: {
                dark: "#212429",
                // dark2: "#09090B",
                dark2: "#060606",
                dark3: "#101011",
                darkHover: "#3D404A",
                light: "#f5f5f5",
                primary: "#39E079",
                danger: "#ef4444",
                midnightblue: "#1b1029",
                statusgreen: "#98dea3",
                statusred: "#f5826f",
                statuspurple: "#e3b9f2",
            },
            fontFamily: {
                poppins: ["Poppins", "sans-serif"],
                mars: ["Mars", "sans-serif"],
            },
            animation: {
                "up-down": "up-down 2s ease-in-out infinite alternate",
            },
            backgroundImage: {
                "text-gradient":
                    "linear-gradient(90deg, #f5826f, #fb928c 0%, #e3b9f2)",
            },
        },
    },
    plugins: [],
}

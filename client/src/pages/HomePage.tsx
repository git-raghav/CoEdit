import FormComponent from "@/components/forms/FormComponent"
import GithubStar from "@/components/github/GithubStar"
import Pattern from "@/components/background/Pattern"
// import Logo from "@/components/logo/Logo"
import Footer from "@/components/common/Footer"

function HomePage() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center gap-16">
            <div className="absolute top-4 right-4">
                <GithubStar />
            </div>
            <div className="absolute inset-0 -z-10">
                <Pattern />
            </div>
            <div className="my-12 flex h-full min-w-full flex-col items-center justify-evenly sm:flex-row sm:pt-0">
                {/* <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-4"><Logo /></div> */}
                <div className="flex w-full animate-up-down justify-center sm:w-1/2 sm:pl-4">
                    <img
                        src="/images/yellowlogo.png"
                        alt="CodeRoom logo"
                        className="w-2/3 max-w-[320px] sm:w-1/2 md:w-2/5"
                    />
                </div>
                <div className="flex w-full items-center justify-center sm:w-1/2">
                    <FormComponent />
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default HomePage

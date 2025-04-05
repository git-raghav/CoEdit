import { ChangeEvent } from "react"
import { ChevronDown } from 'lucide-react';

interface SelectProps {
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void
    value: string
    options: string[]
    title: string
}

function Select({ onChange, value, options, title }: SelectProps) {
    return (
        <div className="relative w-full">
            <label className="mb-2">{title}</label>
            <select
                className="w-full rounded-xl border-none bg-dark px-3 py-2 text-white outline-none"
                value={value}
                onChange={onChange}
            >
                {options.sort().map((option) => {
                    const value = option
                    const name =
                        option.charAt(0).toUpperCase() + option.slice(1)

                    return (
                        <option key={name} value={value}>
                            {name}
                        </option>
                    )
                })}
            </select>
            <ChevronDown
                size={18}
                className="absolute bottom-3 right-4 z-10 text-white"
            />
        </div>
    )
}

export default Select

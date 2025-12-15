import {ReactNode} from "react";
import {IconType} from "react-icons";

interface Props {
    label: string;
    route: string;
    icon: ReactNode;
    className?: string;
    onClick?: () => void;
}

interface PropsMobile {
    label: string;
    route: string;
    icon: ReactNode;
    className?: string;
    onClick?: () => void;
}

export function NavButton({ label, route, icon, className, onClick }: Props) {

    return (
        <>
            <button onClick={onClick} className={`w-1/4 ${className}`}>
                <div className={"rounded-xl"}>
                    <p className={"text-lg font-source-code-pro hover:text-yellow-500 transform transition-all duration-300"}>{label}</p>
                </div>

                {/*<div
                    className={"hover:shadow-primary_light hover:shadow-xl hover:bg-primary_light duration-300 transform transition-all hover:rounded-xl rounded-lg p-2 flex flex-col items-center border-2 border-transparent bg-secondary shadow-lg"}
                >
                    {icon}
                    <p className={"text-sm"}>{label}</p>
                </div>*/}
            </button>
        </>
    )
}

export function NavButtonMobile({ label, route, icon, className, onClick }: PropsMobile) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 ${className}`}
            // (optional) if you want route semantics without changing your onClick logic:
            // aria-label={label}
        >
            <div
                className={[
                    "group w-full rounded-xl px-2 py-2",
                    "flex flex-col items-center justify-center gap-1",
                    "transition-all duration-200",
                    "bg-secondary/80 border border-white/10",
                    "active:scale-[0.98] active:bg-secondary",
                ].join(" ")}
            >
                <div className="text-white/90 group-active:text-white transition-colors">
                    {icon}
                </div>
                <p className="text-[11px] leading-none text-white/70 group-active:text-white/90 transition-colors">
                    {label}
                </p>
            </div>
        </button>
    );
}
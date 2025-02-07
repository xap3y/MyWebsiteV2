import {ReactNode} from "react";

interface Props {
    label: string;
    href: string;
}

export function AboutMeLink({ label, href }: Props) {
    return (
        <>
            <a className={"text-telegramBright"} href={href}>
                {label}
            </a>
        </>
    )
}
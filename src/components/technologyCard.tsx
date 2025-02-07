import {Icon} from "@iconify/react";

interface Props {
    label: string;
    icon: string;
}

export function TechnologyCard({ label, icon }: Props) {
    return (
        <>
            <div className={"p-1 bg-primary_light hover:bg-secondary rounded"}>
                <div className={"bg-primary_light border-secondary hover:bg-secondary hover:border-primary_light duration-150 transition-all rounded border-4 p-2 flex flex-ror gap-2 justify-center items-center"}>
                    <Icon icon={icon} width={30} height={30} />
                    <p>{label}</p>
                </div>
            </div>
        </>
    )
}
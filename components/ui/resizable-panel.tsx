"use client";

import * as React from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import type { GroupProps, SeparatorProps } from "react-resizable-panels";
import { cn } from "@/lib/utils";

type ResizablePanelGroupProps = Omit<GroupProps, "orientation"> & {
    direction?: "horizontal" | "vertical";
};

function ResizablePanelGroup({
    className,
    direction = "horizontal",
    ...props
}: ResizablePanelGroupProps) {
    return (
        <Group
            orientation={direction}
            className={cn(
                "flex h-full w-full",
                direction === "vertical" && "flex-col",
                className
            )}
            {...props}
        />
    );
}

const ResizablePanel = Panel;

function ResizableHandle({
    className,
    withHandle = false,
    ...props
}: SeparatorProps & {
    withHandle?: boolean;
}) {
    return (
        <Separator
            className={cn(
                "group/handle relative flex w-[6px] shrink-0 items-center justify-center transition-colors",
                "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:rounded-full after:bg-zinc-700/50 after:transition-colors",
                "hover:after:bg-emerald-500/60",
                "focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:outline-hidden",
                className
            )}
            {...props}
        >
            {withHandle && (
                <div className="z-10 flex h-6 w-[6px] items-center justify-center rounded-sm border border-zinc-700 bg-zinc-800 transition-colors group-hover/handle:border-emerald-600 group-hover/handle:bg-zinc-700">
                    <svg
                        width="4"
                        height="14"
                        viewBox="0 0 4 14"
                        fill="none"
                        className="text-zinc-500 group-hover/handle:text-emerald-400"
                    >
                        <rect x="1" y="1" width="2" height="2" rx="0.5" fill="currentColor" />
                        <rect x="1" y="5" width="2" height="2" rx="0.5" fill="currentColor" />
                        <rect x="1" y="9" width="2" height="2" rx="0.5" fill="currentColor" />
                    </svg>
                </div>
            )}
        </Separator>
    );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

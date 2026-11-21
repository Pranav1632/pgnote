"use client";

import * as React from "react";
import { Panel, Group, Separator, usePanelRef } from "react-resizable-panels";
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
                "group/handle relative flex w-2 shrink-0 cursor-col-resize select-none touch-none items-center justify-center transition-colors",
                // Expanded 14px hit area
                "after:absolute after:inset-y-0 after:left-1/2 after:w-3.5 after:-translate-x-1/2 after:z-10",
                // Visible 2px divider line
                "before:absolute before:inset-y-0 before:left-1/2 before:w-[2px] before:-translate-x-1/2 before:rounded-full before:bg-zinc-800 before:transition-colors",
                "hover:before:bg-emerald-500/70 active:before:bg-emerald-400",
                "focus-visible:ring-1 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:outline-hidden",
                className
            )}
            {...props}
        >
            {withHandle && (
                <div className="z-20 flex h-7 w-[8px] items-center justify-center rounded-sm border border-zinc-700 bg-zinc-800/90 shadow-sm transition-colors group-hover/handle:border-emerald-500/80 group-hover/handle:bg-zinc-700 group-active/handle:border-emerald-400">
                    <svg
                        width="4"
                        height="14"
                        viewBox="0 0 4 14"
                        fill="none"
                        className="text-zinc-500 transition-colors group-hover/handle:text-emerald-400 group-active/handle:text-emerald-300"
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

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, usePanelRef };

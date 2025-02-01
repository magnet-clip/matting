import type { Component } from "solid-js";

export const FixedWidthText: Component<{ text: string | number | (() => string | number); width: number }> = ({
    text,
    width,
}) => {
    return (
        <span style={{ width: `${width}px`, display: "inline-block", "text-align": "right" }}>
            {typeof text === "function" ? text() : text}
        </span>
    );
};

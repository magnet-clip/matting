import { useUnit } from "effector-solid";
import { Component, createSignal, onMount, onCleanup, Index } from "solid-js";
import { VideoInfo } from "../models/models";
import { uiStore } from "../repo/store";
import { clamp } from "../utils/clamp";

export const SeekSlider: Component<{
    gotoFrame: (frame: number) => void;
    videoInfo: () => VideoInfo;
    marks: () => number[];
}> = ({ gotoFrame, videoInfo, marks }) => {
    let slider!: HTMLSpanElement;

    const ui = useUnit(uiStore);
    const [drag, setDrag] = createSignal(false);

    const handleDrag = (click: boolean, e: MouseEvent) => {
        if (!click && !drag()) return;
        const rect = slider.getBoundingClientRect();
        const clientX = e.pageX;
        const x = clamp(clientX - rect.left, 0, rect.width);
        const frame = Math.round(((videoInfo()?.frames - 1) * x) / rect.width);
        gotoFrame(frame);
    };

    const handleDocumentDrag = (e: MouseEvent) => handleDrag(false, e);
    const cancelDocumentDrag = (e: MouseEvent) => setDrag(false);

    onMount(() => {
        document.addEventListener("mousemove", handleDocumentDrag);
        document.addEventListener("mouseup", cancelDocumentDrag);
    });

    onCleanup(() => {
        document.removeEventListener("mousemove", handleDocumentDrag);
        document.removeEventListener("mouseup", cancelDocumentDrag);
    });

    return (
        <span style={{ width: "80%", position: "relative" }}>
            <span
                ref={slider}
                style={{
                    display: "inline-block",
                    height: "4px",
                    width: "100%",
                    border: "1px solid lightblue",
                    "background-color": "lightblue",
                    "border-radius": "3px",
                    "vertical-align": "middle",
                    cursor: "pointer",
                }}
                onClick={[handleDrag, true]}
                onMouseDown={() => setDrag(true)}
            />
            <span
                style={{
                    position: "absolute",
                    border: "1px solid gray",
                    background: "lightblue",
                    "border-radius": "10px",
                    display: "inline-block",
                    height: "16px",
                    width: "16px",
                    top: "2px",
                    left: `calc(${Math.round((100 * ui().currentFrame) / (videoInfo()?.frames - 1))}% - 6px)`,
                    cursor: "pointer",
                }}
                onMouseDown={() => setDrag(true)}
            />
            <Index each={marks()}>
                {(m) => (
                    <span
                        style={{
                            position: "absolute",
                            border: "1px solid gray",
                            background: "lightblue",
                            "border-radius": "4px",
                            display: "inline-block",
                            height: "4px",
                            width: "4px",
                            top: "8px",
                            left: `${Math.round((100 * m()) / (videoInfo()?.frames - 1))}%`,
                            cursor: "pointer",
                        }}
                        onClick={() => {
                            gotoFrame(m());
                        }}
                    />
                )}
            </Index>
        </span>
    );
};

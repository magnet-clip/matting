import { Button } from "@suid/material";
import { Component, JSX } from "solid-js";
import { importVideo } from "../repo/store";
import AddIcon from "@suid/icons-material/Add";

export const UploadVideo: Component = () => {
    let fileInput!: HTMLInputElement;

    const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
        importVideo(e.currentTarget.files[0]);
        e.currentTarget.value = "";
    };

    return (
        <div style={{ "text-align": "center" }}>
            <form style={{ display: "none" }}>
                <input ref={fileInput} type="file" accept="video/mp4" onChange={handleChange} />
            </form>
            <Button onClick={() => fileInput.click()} startIcon={<AddIcon />}>
                new video
            </Button>
        </div>
    );
};

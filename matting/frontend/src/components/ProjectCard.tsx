import { A } from "@solidjs/router";
import { Divider, IconButton } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createSignal, JSX } from "solid-js";
import { ProjectData } from "../models/models";
import { projectStore, deleteProject } from "../repo/store";
import { arrayToUrl } from "../utils/array-to-url";
import DeleteIcon from "@suid/icons-material/Delete";

export const ProjectCard: Component<{
    info: () => ProjectData;
}> = ({ info }) => {
    const state = useUnit(projectStore);
    const [hover, setHover] = createSignal(false);
    const handleDelete: JSX.EventHandler<HTMLButtonElement, Event> = (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteProject(info().uuid);
    };

    return (
        <A
            style={{
                display: "flex",
                "flex-direction": "column",
                "text-decoration": "none",
            }}
            href={`/${info().uuid}`}
            activeClass="default"
            inactiveClass="default">
            <Divider style={{ "margin-bottom": "5px" }} />
            <span style={{ margin: "5px" }}>
                <img src={arrayToUrl(info().frame)} style={{ width: "200px" }} />
                <span
                    style={{
                        display: "flex",
                        "flex-direction": "row",
                        "justify-content": "space-between",
                    }}
                    onMouseOver={() => setHover(true)}
                    onMouseOut={() => setHover(false)}>
                    <span
                        style={{
                            "font-weight": state().project === info().uuid ? "bold" : null,
                        }}>
                        {info().name || "<no name>"}
                    </span>
                    <span style={{ visibility: hover() ? "visible" : "hidden" }}>
                        <IconButton style={{ padding: 0 }} onClick={(e) => handleDelete(e)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </span>
            </span>
        </A>
    );
};

import { IconButton, Menu, MenuItem } from "@suid/material";
import { useUnit } from "effector-solid";
import { Component, createSignal, createMemo } from "solid-js";
import { projectStore, uiStore, deleteAllPoints, deleteFramePoints } from "../repo/store";
import DeleteIcon from "@suid/icons-material/Delete";

export const DeletePointsButton: Component = () => {
    const [anchorEl, setAnchorEl] = createSignal<SVGSVGElement>(null);
    const open = () => anchorEl() !== null;
    const projects = useUnit(projectStore);
    const ui = useUnit(uiStore);

    const hasPoints = createMemo(() => {
        const currentFrame = ui().currentFrame;
        const uuid = projects().project;
        const project = projects().projects.find((p) => p.uuid === uuid);

        return project.points?.some((p) => p.frame === currentFrame);
    });

    const options = createMemo(() => [
        {
            label: "All points",
            action: () => deleteAllPoints(projects().project),
        },
        {
            label: "Current frame points",
            action: () => deleteFramePoints({ uuid: projects().project, frame: ui().currentFrame }),
            disabled: () => !hasPoints(),
        },
    ]);

    return (
        <span title="Delete points...">
            <IconButton>
                <DeleteIcon onClick={(event) => setAnchorEl(event.currentTarget)} />
            </IconButton>
            <Menu
                id="lock-menu"
                anchorEl={anchorEl()}
                open={open()}
                onClose={() => setAnchorEl(null)}
                MenuListProps={{
                    "aria-labelledby": "lock-button",
                    role: "listbox",
                }}>
                {options().map((option) => (
                    <MenuItem
                        disabled={option.disabled?.()}
                        onClick={() => {
                            setAnchorEl(null);
                            option.action();
                        }}>
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>
        </span>
    );
};

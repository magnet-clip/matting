import { useUnit } from "effector-solid";
import { type Component, Index } from "solid-js";
import { projectStore } from "../repo/store";
import { ProjectCard } from "./ProjectCard";
import { UploadVideo } from "./UploadVideo";

export const ProjectList: Component = () => {
    const state = useUnit(projectStore);

    const projects = () => state().projects.sort((a, b) => b.accessed - a.accessed);

    return (
        <div>
            <UploadVideo />
            <Index each={projects()}>{(project, index) => <ProjectCard info={project} data-index={index} />}</Index>
        </div>
    );
};

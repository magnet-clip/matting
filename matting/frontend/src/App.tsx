import { createEffect, type Component } from "solid-js";
import { Drawer } from "@suid/material";
import { loadProjectList, selectProject, updateProjectAccess } from "./repo/store";
import { useParams } from "@solidjs/router";
import { ProjectList } from "./components/ProjectList";
import { VideoContent } from "./components/VideoContent";

const App: Component = () => {
    const params = useParams();

    createEffect(() => {
        updateProjectAccess(params.projectId);
        loadProjectList();
    });

    createEffect(() => {
        selectProject(params.projectId);
    });

    return (
        <main style={{ display: "flex", "flex-direction": "row" }}>
            <Drawer variant="permanent" PaperProps={{ sx: { width: "210px" } }} style={{ width: "210px" }}>
                <ProjectList />
            </Drawer>
            <VideoContent />
        </main>
    );
};

export default App;

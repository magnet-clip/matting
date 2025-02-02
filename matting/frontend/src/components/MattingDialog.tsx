import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Input,
    Alert,
    LinearProgress,
} from "@suid/material";
import { Component, createSignal } from "solid-js";
import { videoApi } from "../repo/api";
import JSZip from "jszip";
import { setMattings } from "../repo/store";

export const MattingDialog: Component<{
    handleClose: () => void;
    currentFrame: number;
    points: [number, number][];
    hash: string;
    uuid: string;
}> = ({ handleClose, currentFrame, points, hash, uuid }) => {
    const [start, setStart] = createSignal(currentFrame);
    const [finish, setFinish] = createSignal(currentFrame + 1);
    const [error, setError] = createSignal(null);
    const [loading, setLoading] = createSignal(false);
    const [archive, setArchive] = createSignal(null);

    const handleMatting = async () => {
        setError(null);
        const fd = new FormData();
        fd.append("points", JSON.stringify(points));
        fd.append("start", `${start()}`);
        fd.append("finish", `${finish()}`);
        fd.append("hash", hash);

        setLoading(true);
        setArchive(null);
        const zipFile = await videoApi.matting(fd);
        if (zipFile !== null) {
            const archive = await JSZip.loadAsync(zipFile);
            setArchive(await archive.generateAsync({ type: "blob" }));
            const mattings: Record<number, ArrayBuffer> = {};
            for (const filename in archive.files) {
                console.log(filename);
                const file = archive.files[filename];
                console.log(file);
                const contents = await file.async("arraybuffer");
                const frame = +filename.split(".")[0];
                mattings[frame] = contents;
            }
            await setMattings({ uuid, mattings });
        } else {
            setError("Server error");
        }
        setLoading(false);
    };

    const downloadArchive = () => {
        const downloadBlob = (fileName: string, contents: Blob): void => {
            const link = document.createElement("a");
            const url = URL.createObjectURL(contents);
            link.download = fileName;
            link.href = url;
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        };
        downloadBlob("matting.zip", archive());
    };

    return (
        <div>
            <Dialog open={true}>
                <DialogTitle>Matting</DialogTitle>
                <DialogContent>
                    <DialogContentText style={{ display: "grid", "grid-template-columns": "60px 200px" }}>
                        <span style={{ "margin-top": "auto" }}>From</span>
                        <span>
                            <Input value={start()} onChange={(e) => setStart(+e.target.value)} />
                        </span>
                        <span style={{ "margin-top": "auto" }}>To</span>
                        <span>
                            <Input value={finish()} onChange={(e) => setFinish(+e.target.value)} />
                        </span>
                        {error() && (
                            <span style={{ display: "grid", "grid-column": "span 2", padding: "10px" }}>
                                <Alert severity="error">{error()}</Alert>
                            </span>
                        )}
                        {loading() && (
                            <>
                                <span style={{ display: "inline-block", "grid-column": "span 2", padding: "10px" }} />
                                <span style={{ display: "grid", "grid-column": "span 2", padding: "10px" }}>
                                    <LinearProgress />
                                </span>
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    {archive() && (
                        <Button onClick={downloadArchive} color="warning">
                            Download
                        </Button>
                    )}
                    <Button onClick={handleMatting}>Calculate</Button>
                    <Button onClick={handleClose}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

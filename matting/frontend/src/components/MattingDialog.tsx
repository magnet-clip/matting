import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@suid/material";
import { Component } from "solid-js";

export const MattingDialog: Component<{ handleClose: () => void }> = ({ handleClose }) => {
    const handleMatting = () => {};
    return (
        <div>
            <Dialog open={true}>
                <DialogTitle>Matting</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Let Google help apps determine location. This means sending anonymous location data to Google,
                        even when no apps are running.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleMatting}>Calculate</Button>
                    <Button onClick={handleClose}>Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

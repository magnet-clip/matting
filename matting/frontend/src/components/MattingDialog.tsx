import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@suid/material";
import { Component } from "solid-js";

export const MattingDialog: Component<{ handleClose: () => void }> = ({ handleClose }) => {
    return (
        <div>
            <Dialog open={true}>
                <DialogTitle>{"Use Google's location service?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Let Google help apps determine location. This means sending anonymous location data to Google,
                        even when no apps are running.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Disagree</Button>
                    <Button onClick={handleClose}>Agree</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export const readFile = async (file: File): Promise<ArrayBuffer> => {
    return new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result as ArrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    });
};

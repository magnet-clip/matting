export const arrayToUrl = (data: ArrayBuffer) => {
    const blob = new Blob([data]);
    return URL.createObjectURL(blob);
};

export const hashVideo = async (data: ArrayBuffer): Promise<string> => {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((a) => a.toString(16).padStart(2, "0"))
    .join("");
};

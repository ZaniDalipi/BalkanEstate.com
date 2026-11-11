/** Hand the user a text file to save (a template, an export) without a server round trip. */
export const downloadTextFile = (fileName: string, text: string, mimeType: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

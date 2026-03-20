export function downloadTextFile(filename: string, content: string, type = "application/json") {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

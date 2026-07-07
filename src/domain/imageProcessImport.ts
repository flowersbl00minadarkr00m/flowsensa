export interface ImageProcessExtractionRequest {
  fileName: string;
  mimeType: string;
  instruction: string;
}

export function createImageProcessExtractionRequest(file: File): ImageProcessExtractionRequest {
  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    instruction: [
      "Extract process tasks and transitions from this image as candidate JSON.",
      "Return only tasks, transitions, confidence, and unresolved questions.",
      "Label every item as AI-assisted and unconfirmed until the user confirms it in Gate Checks.",
    ].join(" "),
  };
}

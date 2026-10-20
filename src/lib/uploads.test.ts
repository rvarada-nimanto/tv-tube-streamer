import { describe, expect, it } from "vitest";
import { checkUpload } from "./uploads";

const MB = 1024 * 1024;

describe("checkUpload", () => {
  it("accepts the supported image and video types", () => {
    expect(checkUpload({ type: "image/png", size: MB }, "image")).toBeNull();
    expect(checkUpload({ type: "video/quicktime", size: MB }, "video")).toBeNull();
  });

  it("rejects a video picked as an image, and the reverse", () => {
    expect(checkUpload({ type: "video/mp4", size: MB }, "image")?.title).toBe("Invalid file type");
    expect(checkUpload({ type: "image/jpeg", size: MB }, "video")?.description).toBe("Please select a valid video file");
  });

  it("allows files up to the limit", () => {
    expect(checkUpload({ type: "image/jpeg", size: 10 * MB }, "image")).toBeNull();
    expect(checkUpload({ type: "video/mp4", size: 50 * MB }, "video")).toBeNull();
  });

  it("rejects files over the limit with the limit in the message", () => {
    expect(checkUpload({ type: "image/jpeg", size: 10 * MB + 1 }, "image")).toEqual({
      title: "File too large",
      description: "Maximum file size is 10MB",
    });
    expect(checkUpload({ type: "video/webm", size: 50 * MB + 1 }, "video")?.description).toBe("Maximum file size is 50MB");
  });
});

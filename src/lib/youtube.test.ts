import { describe, expect, it } from "vitest";
import { extractYouTubeId, youtubeEmbedUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/v/dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123"],
  ])("reads the id from %s", (url) => {
    expect(extractYouTubeId(url)).toBe("dQw4w9WgXcQ");
  });

  it.each([["https://vimeo.com/123456"], ["https://www.youtube.com/watch?v=short"], ["not a url"], [""]])(
    "returns null for %s",
    (url) => {
      expect(extractYouTubeId(url)).toBeNull();
    }
  );

  it("round-trips through the embed URL", () => {
    expect(extractYouTubeId(youtubeEmbedUrl("dQw4w9WgXcQ"))).toBe("dQw4w9WgXcQ");
  });
});

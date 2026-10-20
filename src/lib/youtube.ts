const YOUTUBE_ID = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;

/** The 11-character video id from any common YouTube URL, or null. */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_ID);
  return match ? match[1] : null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

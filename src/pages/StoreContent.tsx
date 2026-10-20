import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/youtube";
import { 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Loader2, 
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  GripVertical,
  Plus
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string | null;
  content_type: string;
  content_url: string;
  display_order: number | null;
  is_active: boolean | null;
}

interface Store {
  id: string;
  store_name: string;
}

export default function StoreContent() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [store, setStore] = useState<Store | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [contentType, setContentType] = useState<string>("image");
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch store
      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id, store_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (storeError) {
        toast({
          title: "Couldn't load your store",
          description: storeError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!storeData) {
        navigate("/store/setup");
        return;
      }

      setStore(storeData);

      // Fetch content items
      const { data: contentData, error: contentError } = await supabase
        .from("store_default_content")
        .select("*")
        .eq("store_id", storeData.id)
        .order("display_order", { ascending: true });

      if (contentError) {
        toast({
          title: "Couldn't load your content",
          description: contentError.message,
          variant: "destructive",
        });
      } else if (contentData) {
        setContentItems(contentData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, navigate, toast]);

  // A file picked for one type must not be uploaded under another
  useEffect(() => {
    setSelectedFile(null);
  }, [contentType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange
    e.target.value = "";
    if (file) {
      // Validate file type
      const validTypes = contentType === "image" 
        ? ["image/jpeg", "image/png", "image/gif", "image/webp"]
        : ["video/mp4", "video/webm", "video/quicktime"];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `Please select a valid ${contentType} file`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 50MB for videos, 10MB for images)
      const maxSize = contentType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${contentType === "video" ? "50MB" : "10MB"}`,
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  // One past the highest position; the count can collide after a delete
  const nextDisplayOrder = () =>
    contentItems.reduce((max, item) => Math.max(max, item.display_order ?? -1), -1) + 1;

  const handleUpload = async () => {
    if (!store || !user) return;

    if (contentType === "youtube") {
      if (!youtubeUrl.trim()) {
        toast({
          title: "YouTube URL required",
          description: "Please enter a valid YouTube URL",
          variant: "destructive",
        });
        return;
      }

      // Extract YouTube video ID and create embed URL
      const videoId = extractYouTubeId(youtubeUrl);
      if (!videoId) {
        toast({
          title: "Invalid YouTube URL",
          description: "Please enter a valid YouTube video URL",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      const { error } = await supabase
        .from("store_default_content")
        .insert({
          store_id: store.id,
          title: title || "YouTube Video",
          content_type: "youtube",
          content_url: youtubeEmbedUrl(videoId),
          display_order: nextDisplayOrder(),
        });

      if (error) {
        toast({
          title: "Error adding content",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Content added successfully" });
        // Refresh content list
        refreshContent();
        setYoutubeUrl("");
        setTitle("");
      }
      setUploading(false);
      return;
    }

    // Handle file upload
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    // From the checked MIME type, so files without an extension still get one
    const fileExt = selectedFile.type.split("/")[1]?.replace("quicktime", "mov") || "bin";
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("store-content")
      .upload(fileName, selectedFile);

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("store-content")
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase
      .from("store_default_content")
      .insert({
        store_id: store.id,
        title: title || selectedFile.name,
        content_type: contentType,
        content_url: urlData.publicUrl,
        display_order: nextDisplayOrder(),
      });

    if (insertError) {
      toast({
        title: "Error saving content",
        description: insertError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Content uploaded successfully" });
      refreshContent();
      setSelectedFile(null);
      setTitle("");
    }

    setUploading(false);
  };

  const refreshContent = async () => {
    if (!store) return;
    const { data } = await supabase
      .from("store_default_content")
      .select("*")
      .eq("store_id", store.id)
      .order("display_order", { ascending: true });
    if (data) setContentItems(data);
  };

  const handleDelete = async (item: ContentItem) => {
    if (!confirm("Are you sure you want to delete this content?")) return;

    // Delete from storage if it's not a YouTube link
    if (item.content_type !== "youtube" && item.content_url.includes("store-content")) {
      const path = item.content_url.split("store-content/")[1];
      if (path) {
        await supabase.storage.from("store-content").remove([path]);
      }
    }

    const { error } = await supabase
      .from("store_default_content")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Error deleting content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Content deleted" });
      refreshContent();
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="w-5 h-5" />;
      case "video": return <Video className="w-5 h-5" />;
      case "youtube": return <LinkIcon className="w-5 h-5" />;
      default: return <ImageIcon className="w-5 h-5" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-display">Default Content</h1>
            <p className="text-sm text-muted-foreground">{store?.store_name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Content
            </CardTitle>
            <CardDescription>
              Add images, videos, or YouTube links to display when no sponsored ads are playing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="youtube">YouTube Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-title">Title (optional)</Label>
                <Input 
                  id="content-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Content title"
                />
              </div>
            </div>

            {contentType === "youtube" ? (
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input 
                  id="youtube-url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Upload File</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept={contentType === "image" ? "image/*" : "video/*"}
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {selectedFile ? (
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click to upload {contentType === "image" ? "an image" : "a video"}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {contentType === "image" ? "JPG, PNG, GIF, WebP (max 10MB)" : "MP4, WebM, MOV (max 50MB)"}
                    </p>
                  </label>
                </div>
              </div>
            )}

            <Button onClick={handleUpload} disabled={uploading} className="w-full sm:w-auto">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Add Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Content List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Content ({contentItems.length})</CardTitle>
            <CardDescription>
              Content will play in order when no sponsored ads are scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contentItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No content added yet</p>
                <p className="text-sm">Add images, videos, or YouTube links above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contentItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                    
                    {/* Thumbnail */}
                    <div className="w-20 h-12 bg-background rounded overflow-hidden flex-shrink-0">
                      {item.content_type === "image" ? (
                        <img 
                          src={item.content_url} 
                          alt={item.title || "Content"} 
                          className="w-full h-full object-cover"
                        />
                      ) : item.content_type === "youtube" ? (
                        <div className="w-full h-full flex items-center justify-center bg-red-500/10">
                          <Video className="w-6 h-6 text-red-500" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title || "Untitled"}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {getContentIcon(item.content_type)}
                        {item.content_type}
                      </p>
                    </div>

                    {/* Actions */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(item)}
                      aria-label={`Delete ${item.title || "content"}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

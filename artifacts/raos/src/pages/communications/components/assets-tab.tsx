import { useState } from "react";
import { useAssets } from "@/hooks/use-communications";
import { Image as ImageIcon, Upload, File as FileIcon } from "lucide-react";
import { format } from "date-fns";
import { customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function AssetsTab() {
  const { data, isLoading } = useAssets();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Request upload
      const reqRes = await customFetch("/api/communications/assets/request-upload", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type
        }),
        headers: { "Content-Type": "application/json" }
      });
      
      const { uploadURL, objectPath } = reqRes as any;

      // 2. Upload file
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      // 3. Register asset
      await customFetch("/api/communications/assets", {
        method: "POST",
        body: JSON.stringify({
          objectPath,
          name: file.name,
          size: file.size,
          contentType: file.type,
          altText: altText || undefined
        }),
        headers: { "Content-Type": "application/json" }
      });

      qc.invalidateQueries({ queryKey: ["communications-assets"] });
      setAltText("");
    } catch (err: any) {
      alert(err.message || "Upload failed");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading assets...</div>;

  const assets = data?.assets ?? [];

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Media & Assets</h2>
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Alt text (optional)"
            value={altText}
            onChange={e => setAltText(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-slate-400"
          />
          <div className="relative">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
              accept="image/jpeg,image/png,image/webp"
            />
            <button 
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              {uploading ? <span className="animate-spin">⏳</span> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <ImageIcon size={48} className="mb-4 text-slate-200" />
          <p className="text-sm font-medium text-slate-600">No assets yet</p>
          <p className="text-xs mt-1">Upload images to include in campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="border border-slate-200 rounded-lg overflow-hidden flex flex-col group">
              <div className="aspect-square bg-slate-50 flex items-center justify-center border-b border-slate-100 relative">
                {a.content_type.startsWith("image/") ? (
                  <img src={a.serving_url || a.object_path} alt={a.alt_text || a.name} className="w-full h-full object-cover" />
                ) : (
                  <FileIcon size={32} className="text-slate-300" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + (a.serving_url || a.object_path));
                    }}
                    className="px-3 py-1.5 bg-white text-slate-900 rounded-md text-xs font-semibold hover:bg-slate-100"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-slate-900 truncate" title={a.name}>{a.name}</p>
                {a.alt_text && <p className="text-[10px] text-slate-500 truncate mt-0.5" title={a.alt_text}>{a.alt_text}</p>}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">{(a.size / 1024).toFixed(1)} KB</p>
                  <p className="text-[10px] text-slate-400">{format(new Date(a.created_at), "MMM d")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

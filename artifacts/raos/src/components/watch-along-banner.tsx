import { Eye, X } from "lucide-react";
import { useWatchAlong } from "@/hooks/use-watch-along";

export function WatchAlongBanner() {
  const { following, followingUserName, stopFollowing } = useWatchAlong();

  if (!following) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-indigo-600 text-white px-4 py-2 shadow-lg animate-fade-in">
      <Eye size={16} />
      <span className="text-sm font-medium">
        Following {followingUserName ?? "your mentor"}&apos;s screen
      </span>
      <button
        onClick={stopFollowing}
        className="rounded-full p-1 hover:bg-white/20 transition-colors"
        aria-label="Stop following"
      >
        <X size={14} />
      </button>
    </div>
  );
}

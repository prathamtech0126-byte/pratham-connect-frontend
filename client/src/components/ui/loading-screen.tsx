import logoGif from "@/assets/Pratham Connect logo animation.gif";
import logoGifWhite from "@/assets/Pratham Connect logo animation White.gif";

/** Drop-in replacement for <Loader2 className="animate-spin" />.
 *  Pass a size class like "w-16 h-16" via className. */
export function GifSpinner({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <>
      <img src={logoGif} alt="Loading…" className={`object-contain block dark:hidden ${className}`} />
      <img src={logoGifWhite} alt="Loading…" className={`object-contain hidden dark:block ${className}`} />
    </>
  );
}

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  message,
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={
        fullScreen
          ? "min-h-screen flex items-center justify-center bg-background"
          : "flex items-center justify-center p-8"
      }
    >
      <div className="flex flex-col items-center gap-3">
        <GifSpinner className="w-20 h-20" />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

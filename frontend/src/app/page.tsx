"use client";

import { useVideoChat } from "@/hooks/useVideoChat";

export default function Home() {
  const { status, localVideoRef, remoteVideoRef, startCall, cancelSearch, endCall } =
    useVideoChat();

  const showLocalPreview =
    status === "requesting-media" ||
    status === "searching" ||
    status === "connecting" ||
    status === "in-call";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Random Video Chat
        </h1>

        {status === "idle" && (
          <>
            <p className="text-zinc-600 dark:text-zinc-400">
              Talk to a random stranger over video, anonymously. No sign-up
              required.
            </p>
            <button
              type="button"
              onClick={startCall}
              className="h-12 w-full max-w-xs rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Start Video Chat
            </button>
          </>
        )}

        {status === "media-error" && (
          <>
            <p className="text-red-600 dark:text-red-400">
              Camera and microphone access is required. Please allow access
              in your browser and try again.
            </p>
            <button
              type="button"
              onClick={startCall}
              className="h-12 w-full max-w-xs rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Try Again
            </button>
          </>
        )}

        {showLocalPreview && (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full scale-x-[-1] rounded-xl bg-zinc-900 object-cover"
            />
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="aspect-video w-full rounded-xl bg-zinc-900 object-cover"
            />
          </div>
        )}

        {status === "searching" && (
          <>
            <p className="text-zinc-600 dark:text-zinc-400">
              Looking for someone to chat with...
            </p>
            <button
              type="button"
              onClick={cancelSearch}
              className="h-12 w-full max-w-xs rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Cancel
            </button>
          </>
        )}

        {status === "connecting" && (
          <p className="text-zinc-600 dark:text-zinc-400">Connecting...</p>
        )}

        {status === "in-call" && (
          <button
            type="button"
            onClick={endCall}
            className="h-12 w-full max-w-xs rounded-full bg-red-600 px-5 text-white transition-colors hover:bg-red-700"
          >
            End Call
          </button>
        )}

        {status === "ended" && (
          <>
            <p className="text-zinc-600 dark:text-zinc-400">
              The stranger disconnected.
            </p>
            <button
              type="button"
              onClick={startCall}
              className="h-12 w-full max-w-xs rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Start Video Chat
            </button>
          </>
        )}
      </main>
    </div>
  );
}

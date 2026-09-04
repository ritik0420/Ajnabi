"use client";

import { useState } from "react";
import { REPORT_REASONS, useVideoChat, type ReportReason } from "@/hooks/useVideoChat";

export default function Home() {
  const {
    status,
    localVideoRef,
    remoteVideoRef,
    startCall,
    cancelSearch,
    skipToNext,
    findNext,
    submitReport,
    endCall,
  } = useVideoChat();

  const [reportOpen, setReportOpen] = useState(false);

  const showLocalPreview =
    status === "requesting-media" ||
    status === "searching" ||
    status === "connecting" ||
    status === "in-call" ||
    status === "ended";

  function handleReport(reason: ReportReason) {
    setReportOpen(false);
    submitReport(reason);
  }

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

        {status === "banned" && (
          <p className="text-red-600 dark:text-red-400">
            You&apos;ve been temporarily restricted after multiple reports
            from other users.
          </p>
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

        {status === "in-call" && !reportOpen && (
          <div className="flex w-full max-w-sm gap-3">
            <button
              type="button"
              onClick={skipToNext}
              className="h-12 flex-1 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="h-12 flex-1 rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Report
            </button>
            <button
              type="button"
              onClick={endCall}
              className="h-12 flex-1 rounded-full bg-red-600 px-5 text-white transition-colors hover:bg-red-700"
            >
              End Call
            </button>
          </div>
        )}

        {status === "in-call" && reportOpen && (
          <div className="flex w-full max-w-sm flex-col gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Why are you reporting this person?
            </p>
            {REPORT_REASONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleReport(value)}
                className="h-11 w-full rounded-full border border-solid border-black/[.08] px-5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="h-11 w-full rounded-full px-5 text-sm text-zinc-500 transition-colors hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]"
            >
              Cancel
            </button>
          </div>
        )}

        {status === "ended" && (
          <>
            <p className="text-zinc-600 dark:text-zinc-400">
              The stranger disconnected.
            </p>
            <div className="flex w-full max-w-xs gap-3">
              <button
                type="button"
                onClick={findNext}
                className="h-12 flex-1 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Find New
              </button>
              <button
                type="button"
                onClick={endCall}
                className="h-12 flex-1 rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                Leave
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

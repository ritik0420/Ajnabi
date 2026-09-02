export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Random Video Chat
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Talk to a random stranger over video, anonymously. No sign-up
          required.
        </p>
        <button
          type="button"
          className="h-12 w-full max-w-xs rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Start Video Chat
        </button>
      </main>
    </div>
  );
}

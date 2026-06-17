export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex gap-1 items-center bg-gray-100 dark:bg-gray-800 px-3 py-2.5 rounded-2xl rounded-bl-sm">
        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      {name && <span className="text-xs text-gray-400 dark:text-gray-500">{name} is typing…</span>}
    </div>
  );
}

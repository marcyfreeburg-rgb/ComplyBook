import { createContext, useContext, useState, useCallback } from "react";

type AnnounceOptions = {
  message: string;
  priority?: "polite" | "assertive";
};

type LiveAnnouncerContextType = {
  announce: (options: AnnounceOptions) => void;
};

const LiveAnnouncerContext = createContext<LiveAnnouncerContextType>({
  announce: () => {},
});

export function useLiveAnnouncer() {
  return useContext(LiveAnnouncerContext);
}

export function LiveAnnouncerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback(({ message, priority = "polite" }: AnnounceOptions) => {
    if (priority === "assertive") {
      setAssertiveMessage("");
      requestAnimationFrame(() => setAssertiveMessage(message));
    } else {
      setPoliteMessage("");
      requestAnimationFrame(() => setPoliteMessage(message));
    }
  }, []);

  return (
    <LiveAnnouncerContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="text-live-announcer-polite"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="text-live-announcer-assertive"
      >
        {assertiveMessage}
      </div>
    </LiveAnnouncerContext.Provider>
  );
}

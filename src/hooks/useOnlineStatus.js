import { useEffect, useState } from "react";

export default function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      setWasOffline(true);
      setTimeout(() => setWasOffline(false), 4000);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { online, wasOffline };
}
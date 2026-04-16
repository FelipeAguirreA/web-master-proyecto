"use client";

import { useEffect, useState } from "react";

export function useUnreadCount() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetch_ = () => {
      fetch("/api/chat/conversations")
        .then((r) => r.json())
        .then((data: { unreadCount?: number }[]) => {
          if (!Array.isArray(data)) return;
          const total = data.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
          setUnread(total);
        })
        .catch(() => null);
    };

    fetch_();
    const interval = setInterval(fetch_, 5000);
    return () => clearInterval(interval);
  }, []);

  return unread;
}

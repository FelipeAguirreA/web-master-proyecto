"use client";

import { useEffect, useRef, useState } from "react";

type CounterProps = {
  to: number;
  suf?: string;
  dec?: number;
};

export function Counter({ to, suf = "", dec = 0 }: CounterProps) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !done.current) {
          done.current = true;
          const step = 16;
          const inc = to / (1600 / step);
          let cur = 0;
          const t = setInterval(() => {
            cur = Math.min(cur + inc, to);
            setV(parseFloat(cur.toFixed(dec)));
            if (cur >= to) clearInterval(t);
          }, step);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [to, dec]);

  const display = dec ? v.toFixed(dec) : Math.floor(v).toLocaleString("es-CL");

  return (
    <span ref={ref}>
      {display}
      {suf}
    </span>
  );
}

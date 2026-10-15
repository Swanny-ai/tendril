"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  poster: string;
  /** What the video shows, for screen readers. */
  label: string;
  width: number;
  height: number;
  className?: string;
  /** Load straight away (above the fold) instead of when scrolled near. */
  eager?: boolean;
};

/**
 * Muted, looping product video. Plays only while on screen, never autoplays for people who
 * prefer reduced motion, and always has a pause button (WCAG 2.2.2).
 */
export function LoopVideo({ src, poster, label, width, height, className, eager = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) userPaused.current = true;
    let inView = false;
    const sync = () => {
      if (inView && !userPaused.current && document.visibilityState === "visible") void video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && video.preload === "none") video.preload = "auto";
        sync();
      },
      { rootMargin: "200px 0px", threshold: 0.15 },
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      void video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  };

  return (
    <div className={cn("group relative", className)}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        width={width}
        height={height}
        muted
        loop
        playsInline
        preload={eager ? "auto" : "none"}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPlaying={() => setStarted(true)}
        onPause={() => setPlaying(false)}
        className="block h-full w-full object-cover"
      />
      {/* The first frames fade in from blank, so keep the poster on top until playback starts. */}
      {!started ? <Image src={poster} alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="pointer-events-none object-cover" priority={eager} /> : null}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause video: ${label}` : `Play video: ${label}`}
        className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-black/55 text-white opacity-70 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      </button>
    </div>
  );
}

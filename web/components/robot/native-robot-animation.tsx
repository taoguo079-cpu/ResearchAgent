"use client";

import Image from "next/image";
import type { AnimationItem } from "lottie-web";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePreferencesStore } from "@/features/preferences/preferences-store";
import manifest from "@/public/research-robot/manifest.json";
import styles from "./native-robot-animation.module.css";

export type RobotAction = keyof typeof manifest.assets;
type Action = RobotAction;

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function reducedMotion() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Poster({
  action,
  hidden = false,
}: {
  action: Action;
  hidden?: boolean;
}) {
  const spec = manifest.assets[action];
  return (
    <Image
      src={spec.posterSrc}
      width={spec.posterWidth}
      height={spec.posterHeight}
      alt=""
      aria-hidden="true"
      className={styles.poster}
      style={{ opacity: hidden ? 0 : 1 }}
      unoptimized
      loading="eager"
      data-testid="research-robot-poster"
    />
  );
}

function AnimatedPose({ action, paused }: { action: Action; paused: boolean }) {
  const spec = manifest.assets[action];
  const hostRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const pausedRef = useRef(paused);
  const visibleRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    const animation = animationRef.current;
    if (!animation?.isLoaded) return;
    const stop =
      paused || !visibleRef.current || document.visibilityState === "hidden";
    if (stop) animation.pause();
    else animation.play();
    if (hostRef.current)
      hostRef.current.dataset.researchPlayback = stop ? "paused" : "playing";
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let disposed = false;
    let animation: AnimationItem | undefined;
    const playback = () => {
      if (!animation?.isLoaded) return;
      const stop =
        pausedRef.current ||
        !visibleRef.current ||
        document.visibilityState === "hidden";
      if (stop) animation.pause();
      else animation.play();
      host.dataset.researchPlayback = stop ? "paused" : "playing";
    };
    const fail = () => {
      if (disposed) return;
      animation?.destroy();
      animation = undefined;
      animationRef.current = null;
      setFailed(true);
    };
    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            visibleRef.current = entry.isIntersecting;
            playback();
          })
        : null;
    observer?.observe(host);
    document.addEventListener("visibilitychange", playback);
    const load = async () => {
      const [response, { default: lottie }] = await Promise.all([
        fetch(spec.src, { signal: controller.signal }),
        import("lottie-web"),
      ]);
      if (!response.ok)
        throw new Error("Stage robot animation could not be loaded.");
      const data = await response.json();
      if (
        data.fr !== 60 ||
        data.fr !== spec.fps ||
        data.op - data.ip !== spec.frames ||
        data.w !== spec.width ||
        data.h !== spec.height
      )
        throw new Error(
          "Stage robot must match its verified native60fps source.",
        );
      if (disposed) return;
      animation = lottie.loadAnimation({
        container: host,
        renderer: "svg",
        animationData: data,
        loop: true,
        autoplay: false,
        rendererSettings: {
          viewBoxSize: `${spec.crop.left} ${spec.crop.top} ${spec.crop.width} ${spec.crop.height}`,
          preserveAspectRatio: "xMidYMid meet",
        },
      });
      animationRef.current = animation;
      animation.setSubframe(true);
      const onReady = () => {
        if (disposed) return;
        setReady(true);
        playback();
      };
      animation.addEventListener("DOMLoaded", onReady);
      animation.addEventListener("data_failed", fail);
      animation.addEventListener("error", fail);
      if (animation.isLoaded) onReady();
    };
    void load().catch(fail);
    return () => {
      disposed = true;
      controller.abort();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", playback);
      animationRef.current = null;
      animation?.destroy();
    };
  }, [spec]);

  return (
    <div
      className={styles.media}
      data-research-media={failed ? "error" : ready ? "animation" : "loading"}
    >
      <Poster action={action} hidden={ready && !failed} />
      {!failed ? (
        <div
          ref={hostRef}
          className={styles.animation}
          style={{ opacity: ready ? 1 : 0 }}
          data-testid="research-robot-animation"
          data-research-fps={spec.fps}
          data-research-frames={spec.frames}
          data-research-playback="loading"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

/** A single native60fps vector player shared by the research hero and companion. */
export function NativeRobotAnimation({
  action,
  className,
  paused = false,
}: {
  action: RobotAction;
  className?: string;
  paused?: boolean;
}) {
  const motion = usePreferencesStore((state) => state.pet.motion);
  const systemReduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotion,
    () => true,
  );
  const staticPose =
    systemReduced || motion === "static" || motion === "reduced";
  return (
    <div
      className={`${styles.robot}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      data-testid="native-robot-animation"
      data-research-action={action}
      data-research-fps={manifest.assets[action].fps}
    >
      {staticPose ? (
        <div className={styles.media} data-research-media="poster">
          <Poster action={action} />
        </div>
      ) : (
        <AnimatedPose key={action} action={action} paused={paused} />
      )}
    </div>
  );
}

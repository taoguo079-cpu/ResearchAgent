"use client";

import Image from "next/image";
import type { AnimationItem } from "lottie-web";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePreferencesStore } from "@/features/preferences/preferences-store";
import manifest from "@/public/brand-robot/manifest.json";
import styles from "./brand-robot.module.css";

type BrandAction = "search" | "idle" | "filter";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function reducedMotion() {
  // Prefer a stable poster when media-query support is unavailable.
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Poster({
  action,
  hidden = false,
}: {
  action: BrandAction;
  hidden?: boolean;
}) {
  const spec = manifest.states[action];
  return (
    <Image
      className={styles.poster}
      style={{ opacity: hidden ? 0 : 1 }}
      src={spec.posterSrc}
      width={spec.width}
      height={spec.height}
      alt=""
      aria-hidden="true"
      data-testid="brand-robot-poster"
      loading="eager"
      unoptimized
    />
  );
}

function AnimatedPose({ action }: { action: BrandAction }) {
  const spec = manifest.states[action];
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new AbortController();
    let disposed = false;
    let animation: AnimationItem | undefined;
    const fail = () => {
      if (disposed) return;
      animation?.destroy();
      animation = undefined;
      setFailed(true);
    };
    const updatePlayback = () => {
      if (!animation?.isLoaded) return;
      if (document.visibilityState === "hidden") {
        animation.pause();
        host.dataset.brandPlayback = "paused";
      } else {
        animation.play();
        host.dataset.brandPlayback = "playing";
      }
    };
    const load = async () => {
      const [response, { default: lottie }] = await Promise.all([
        fetch(spec.animation.src, { signal: controller.signal }),
        import("lottie-web"),
      ]);
      if (!response.ok) throw new Error("Robot animation could not be loaded.");
      const data = await response.json();
      if (
        data.fr !== spec.animation.fps ||
        data.op - data.ip !== spec.animation.frames ||
        data.w !== spec.animation.width ||
        data.h !== spec.animation.height
      ) {
        throw new Error("Robot animation does not match its source metadata.");
      }
      if (disposed) return;
      animation = lottie.loadAnimation({
        container: host,
        renderer: "svg",
        animationData: data,
        loop: true,
        autoplay: false,
        rendererSettings: {
          // Reuse the fixed union crop without rasterizing the original vectors.
          viewBoxSize: `${spec.crop.left} ${spec.crop.top} ${spec.crop.width} ${spec.crop.height}`,
          preserveAspectRatio: "none",
        },
      });
      animation.setSubframe(true);
      const onReady = () => {
        if (disposed) return;
        setReady(true);
        updatePlayback();
      };
      animation.addEventListener("DOMLoaded", onReady);
      animation.addEventListener("data_failed", fail);
      animation.addEventListener("error", fail);
      animation.addEventListener("loopComplete", () => {
        host.dataset.brandLoops = String(Number(host.dataset.brandLoops) + 1);
      });
      if (animation.isLoaded) onReady();
    };
    document.addEventListener("visibilitychange", updatePlayback);
    void load().catch(fail);
    return () => {
      disposed = true;
      controller.abort();
      document.removeEventListener("visibilitychange", updatePlayback);
      animation?.destroy();
    };
  }, [spec]);

  return (
    <div
      className={styles.media}
      data-brand-media={failed ? "error" : ready ? "animation" : "loading"}
    >
      <Poster action={action} hidden={ready && !failed} />
      {!failed ? (
        <div
          ref={hostRef}
          className={styles.animation}
          style={{ opacity: ready ? 1 : 0 }}
          data-testid="brand-robot-animation"
          data-brand-fps={spec.animation.fps}
          data-brand-frames={spec.animation.frames}
          data-brand-loops="0"
          data-brand-playback="loading"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

function RobotMedia({ action, flip }: { action: BrandAction; flip: boolean }) {
  const spec = manifest.states[action];
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
      className={styles.stage}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <div
        className={styles.visual}
        style={{
          left: `${spec.placement.left}%`,
          top: `${spec.placement.top}%`,
          width: `${spec.placement.width}%`,
          height: `${spec.placement.height}%`,
        }}
      >
        {staticPose ? (
          <div className={styles.media} data-brand-media="poster">
            <Poster action={action} />
          </div>
        ) : (
          <AnimatedPose action={action} />
        )}
      </div>
    </div>
  );
}

/** Illustration poses are independent of the current research business state. */
export function BrandRobot({
  action,
  className,
  flip = false,
}: {
  action: BrandAction;
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      className={className}
      aria-hidden="true"
      data-testid="brand-robot"
      data-brand-action={action}
    >
      <RobotMedia key={action} action={action} flip={flip} />
    </div>
  );
}

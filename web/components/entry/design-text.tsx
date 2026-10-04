"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import manifest from "@/public/design-text/manifest.json";
import styles from "./design-text.module.css";

export type DesignTextAsset = keyof typeof manifest.assets;

/** Original outlined lettering plus semantic text for real controls and headings. */
export function DesignText({
  asset,
  children,
  className,
  forceVector = false,
  style,
}: {
  asset: DesignTextAsset;
  children: ReactNode;
  className?: string;
  forceVector?: boolean;
  style?: CSSProperties;
}) {
  const locale = useLocale();
  const spec = manifest.assets[asset];
  if (!forceVector && locale !== "en") {
    return (
      <span className={className} data-design-vector="false">
        {children}
      </span>
    );
  }
  return (
    <span
      className={`${styles.text} ${className ?? ""}`}
      data-design-vector="true"
      data-design-text={asset}
      style={{ width: spec.width, height: spec.height, ...style }}
    >
      <span className="sr-only">{children}</span>
      <Image
        src={spec.src}
        width={spec.width}
        height={spec.height}
        alt=""
        aria-hidden="true"
        className={styles.artwork}
        unoptimized
      />
    </span>
  );
}

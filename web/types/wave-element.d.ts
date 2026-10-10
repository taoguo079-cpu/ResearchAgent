import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { WelcomeWaveElement } from "@/features/welcome/wave-element";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-waves": DetailedHTMLProps<
        HTMLAttributes<WelcomeWaveElement>,
        WelcomeWaveElement
      >;
    }
  }
}

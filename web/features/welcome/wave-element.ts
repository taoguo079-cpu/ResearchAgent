import { mountWelcomeWaves } from "./wave-field";

export interface WelcomeWaveElement extends HTMLElement {
  startWaves(canvas: HTMLCanvasElement, interactionTarget: HTMLElement): void;
  stopWaves(): void;
}

export function registerWelcomeWaves() {
  if (customElements.get("a-waves")) return;
  customElements.define(
    "a-waves",
    class extends HTMLElement implements WelcomeWaveElement {
      private field: ReturnType<typeof mountWelcomeWaves> | null = null;
      private canvas: HTMLCanvasElement | null = null;
      private target: HTMLElement | null = null;

      connectedCallback() {
        if (this.canvas && this.target)
          this.startWaves(this.canvas, this.target);
      }

      disconnectedCallback() {
        this.stopWaves();
      }

      startWaves(canvas: HTMLCanvasElement, interactionTarget: HTMLElement) {
        this.canvas = canvas;
        this.target = interactionTarget;
        if (this.isConnected && !this.field)
          this.field = mountWelcomeWaves(this, canvas, interactionTarget);
      }

      stopWaves() {
        this.field?.dispose();
        this.field = null;
      }
    },
  );
}

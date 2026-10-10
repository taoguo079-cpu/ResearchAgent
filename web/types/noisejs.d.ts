declare module "noisejs" {
  export class Noise {
    constructor(seed?: number);
    perlin2(x: number, y: number): number;
  }
}

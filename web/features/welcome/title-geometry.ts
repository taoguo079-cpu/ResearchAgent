import {
  Box2,
  BufferGeometry,
  CurvePath,
  LineCurve3,
  TubeGeometry,
  Vector3,
} from "three";
import { FontLoader, type FontData } from "three/addons/loaders/FontLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import fontData from "./droid-title.font.json";

const font = new FontLoader().parse(fontData as unknown as FontData);
export type TitlePoint = { x: number; y: number };
export type TitleSegment = {
  x: number;
  y: number;
  length: number;
  angle: number;
};
export type TitleLayout = {
  contours: TitlePoint[][];
  segments: TitleSegment[];
  anchor: TitlePoint;
  radius: number;
  depth: number;
  shear: TitlePoint;
  width: number;
  height: number;
};

export function makeTitleLayout(width: number, height: number): TitleLayout {
  const lines = width < 640 ? ["Research", "Agent"] : ["Research Agent"];
  const paths = lines.map((line) =>
    font
      .generateShapes(line, 1)
      .flatMap((shape) => [shape, ...shape.holes])
      .map((path) => path.getPoints(5)),
  );
  const boxes = paths.map((contours) =>
    new Box2().setFromPoints(contours.flat()),
  );
  const naturalWidth = Math.max(...boxes.map((box) => box.max.x - box.min.x));
  const capHeight = Math.max(...boxes.map((box) => box.max.y - box.min.y));
  const naturalHeight = capHeight * (lines.length === 2 ? 2.45 : 1);
  const scale = Math.min(
    Math.min(width * 0.82, 1120) / naturalWidth,
    (height * (lines.length === 2 ? 0.28 : 0.17)) / naturalHeight,
  );
  const contours = paths.flatMap((line, row) => {
    const box = boxes[row];
    const centerX = (box.min.x + box.max.x) / 2,
      centerY = (box.min.y + box.max.y) / 2;
    const offset =
      lines.length === 2 ? (row === 0 ? 1 : -1) * capHeight * 0.725 : 0;
    return line
      .map((points) => {
        const result: TitlePoint[] = [];
        for (const point of points) {
          const next = {
            x: (point.x - centerX) * scale,
            y: (point.y - centerY + offset) * scale,
          };
          const last = result.at(-1);
          if (!last || Math.hypot(next.x - last.x, next.y - last.y) > 0.7)
            result.push(next);
        }
        if (result.length > 2) {
          const first = result[0],
            last = result.at(-1)!;
          if (Math.hypot(first.x - last.x, first.y - last.y) > 0.01)
            result.push({ ...first });
        }
        return result;
      })
      .filter((points) => points.length > 2);
  });
  const radius = Math.max(1.1, Math.min(2.4, capHeight * scale * 0.019));
  const depth = Math.max(8, Math.min(22, capHeight * scale * 0.18));
  const shear = { x: depth * 0.42, y: -depth * 0.23 };
  const segments = contours
    .flatMap((points) =>
      points.slice(1).map((point, index) => {
        const previous = points[index];
        return {
          x: (point.x + previous.x) / 2 + shear.x / 2,
          y: (point.y + previous.y) / 2 + shear.y / 2,
          length: Math.hypot(point.x - previous.x, point.y - previous.y),
          angle: Math.atan2(point.y - previous.y, point.x - previous.x),
        };
      }),
    )
    .filter((segment) => segment.length > 0.01);
  return {
    contours,
    segments,
    radius,
    depth,
    shear,
    anchor: { x: 0, y: height * (height <= 500 ? 0.14 : 0.1) },
    width: naturalWidth * scale + shear.x,
    height: naturalHeight * scale + Math.abs(shear.y),
  };
}

export function buildTitleGeometry(layout: TitleLayout) {
  const front: BufferGeometry[] = [],
    back: BufferGeometry[] = [],
    sides: BufferGeometry[] = [];
  for (const points of layout.contours) {
    for (const isBack of [false, true]) {
      const path = new CurvePath<Vector3>();
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        const sx = isBack ? layout.shear.x : 0,
          sy = isBack ? layout.shear.y : 0,
          z = ((isBack ? -1 : 1) * layout.depth) / 2;
        path.add(
          new LineCurve3(
            new Vector3(a.x + sx, a.y + sy, z),
            new Vector3(b.x + sx, b.y + sy, z),
          ),
        );
      }
      (isBack ? back : front).push(
        new TubeGeometry(
          path,
          Math.max(8, points.length * 2),
          layout.radius * (isBack ? 0.8 : 1),
          6,
          false,
        ),
      );
    }
    // Bridges show the extrusion depth while leaving the letter faces open.
    for (
      let i = 0;
      i < points.length - 1;
      i += Math.max(3, Math.floor(points.length / 6))
    ) {
      const point = points[i];
      const path = new LineCurve3(
        new Vector3(point.x, point.y, layout.depth / 2),
        new Vector3(
          point.x + layout.shear.x,
          point.y + layout.shear.y,
          -layout.depth / 2,
        ),
      );
      sides.push(new TubeGeometry(path, 1, layout.radius * 0.65, 6, false));
    }
  }
  const merge = (parts: BufferGeometry[]) => {
    const merged = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return merged;
  };
  return { front: merge(front), back: merge(back), sides: merge(sides) };
}

import type { Lens, LensObject, RaySegment, ImageInfo } from "@/components/lens-builder/types";

/**
 * Thin lens equation: 1/v - 1/u = 1/f
 * Convention: u is negative for real objects (left of lens), v positive for real images (right of lens)
 * Returns v (image distance from lens)
 */
export function thinLensImageDistance(u: number, f: number): number {
  // 1/v = 1/f + 1/u  (since 1/v - 1/u = 1/f => 1/v = 1/f + 1/u)
  const invV = 1 / f + 1 / u;
  if (Math.abs(invV) < 1e-10) return Infinity; // object at focal point
  return 1 / invV;
}

/**
 * Lensmaker's equation:
 * 1/f = (n-1) * [1/R1 - 1/R2 + (n-1)*d / (n*R1*R2)]
 * Sign convention: R positive if center of curvature is to the right
 */
export function lensmakersEquation(
  r1: number,
  r2: number,
  n: number,
  d: number = 0
): number {
  let invF = (n - 1) * (1 / r1 - 1 / r2);
  if (d > 0) {
    invF += (n - 1) * ((n - 1) * d) / (n * r1 * r2);
  }
  if (Math.abs(invF) < 1e-10) return Infinity;
  return 1 / invF;
}

/**
 * Get effective focal length for a lens, considering thick lens mode
 */
export function getEffectiveFocalLength(lens: Lens): number {
  if (lens.thickLensMode && lens.allowDifferentCurvature) {
    return lensmakersEquation(
      lens.r1,
      lens.r2,
      lens.refractiveIndex,
      lens.thickness
    );
  }
  if (lens.allowDifferentCurvature) {
    return lensmakersEquation(lens.r1, lens.r2, lens.refractiveIndex);
  }
  return lens.focalLength;
}

/**
 * Compute image info for a single object through a single lens
 */
export function computeImageThroughLens(
  objectPos: number,
  objectHeight: number,
  lensPos: number,
  focalLength: number
): { imagePos: number; imageHeight: number; magnification: number } {
  // u = object distance from lens (negative for real object to the left)
  const u = objectPos - lensPos;

  if (Math.abs(u) < 1e-6) {
    // Object is at the lens
    return { imagePos: objectPos, imageHeight: objectHeight, magnification: 1 };
  }

  const v = thinLensImageDistance(u, focalLength);

  if (!isFinite(v)) {
    // Object at focal point - image at infinity
    return { imagePos: lensPos + 10000, imageHeight: 0, magnification: 0 };
  }

  const m = v / u; // lateral magnification
  return {
    imagePos: lensPos + v,
    imageHeight: objectHeight * m,
    magnification: m,
  };
}

/**
 * Trace rays through a multi-lens system for a given object.
 * Returns ray segments and final image info.
 */
export function traceRays(
  obj: LensObject,
  lenses: Lens[],
  canvasWidth: number,
  canvasHeight: number,
  simToCanvas: (x: number, y: number) => { cx: number; cy: number },
): { rays: RaySegment[]; image: ImageInfo | null } {
  if (lenses.length === 0) return { rays: [], image: null };

  // Sort lenses by position (left to right)
  const sortedLenses = [...lenses].sort((a, b) => a.position - b.position);

  const rays: RaySegment[] = [];
  const rayColor = obj.color;
  const rayAlpha = "66"; // ~40% opacity in hex

  let currentObjPos = obj.position;
  let currentObjHeight = obj.height;
  let totalMagnification = 1;

  for (let i = 0; i < sortedLenses.length; i++) {
    const lens = sortedLenses[i];
    const f = getEffectiveFocalLength(lens);

    const { imagePos, imageHeight, magnification } = computeImageThroughLens(
      currentObjPos,
      currentObjHeight,
      lens.position,
      f
    );

    const isVirtual = imagePos < lens.position; // image on same side as object for this lens
    const leftBound = i === 0 ? -canvasWidth : sortedLenses[i - 1].position;
    const rightBound =
      i === sortedLenses.length - 1
        ? canvasWidth
        : sortedLenses[i + 1].position;

    // Ray 1: Parallel to axis → through far focal point
    // From object tip, parallel to axis, hits lens, then toward/through focal point
    const objTip = simToCanvas(currentObjPos, currentObjHeight);
    const lensCenter = simToCanvas(lens.position, 0);
    const lensTop = simToCanvas(lens.position, currentObjHeight);

    // Parallel ray: object tip → lens at same height
    rays.push({
      x1: objTip.cx,
      y1: objTip.cy,
      x2: lensTop.cx,
      y2: lensTop.cy,
      dashed: false,
      color: rayColor + rayAlpha,
    });

    // After lens: through focal point
    const focalFar = simToCanvas(lens.position + f, 0);
    if (f > 0) {
      // Converging: ray goes through far focal point
      // Extend line from (lensTop) through (focalFar) to edge
      const dx = focalFar.cx - lensTop.cx;
      const dy = focalFar.cy - lensTop.cy;
      if (Math.abs(dx) > 0.1) {
        const extendX = dx > 0 ? simToCanvas(rightBound, 0).cx : simToCanvas(leftBound, 0).cx;
        const t = (extendX - lensTop.cx) / dx;
        rays.push({
          x1: lensTop.cx,
          y1: lensTop.cy,
          x2: lensTop.cx + dx * t,
          y2: lensTop.cy + dy * t,
          dashed: false,
          color: rayColor + rayAlpha,
        });
      }
    } else {
      // Diverging: ray appears to come from near focal point
      // It actually diverges, so draw the real diverging ray forward
      const nearFocal = simToCanvas(lens.position + f, 0); // f is negative, so this is to the left
      const dx = lensTop.cx - nearFocal.cx;
      const dy = lensTop.cy - nearFocal.cy;
      if (Math.abs(dx) > 0.1) {
        const extendX = simToCanvas(rightBound, 0).cx;
        const t = (extendX - lensTop.cx) / dx;
        rays.push({
          x1: lensTop.cx,
          y1: lensTop.cy,
          x2: lensTop.cx + dx * t,
          y2: lensTop.cy + dy * t,
          dashed: false,
          color: rayColor + rayAlpha,
        });
        // Dashed extension backward to focal point
        rays.push({
          x1: lensTop.cx,
          y1: lensTop.cy,
          x2: nearFocal.cx,
          y2: nearFocal.cy,
          dashed: true,
          color: rayColor + rayAlpha,
        });
      }
    }

    // Ray 2: Through optical center → straight through
    const imgTip = simToCanvas(imagePos, imageHeight);
    {
      const dx = lensCenter.cx - objTip.cx;
      const dy = lensCenter.cy - objTip.cy;
      if (Math.abs(dx) > 0.1) {
        const extendX = dx > 0 ? simToCanvas(rightBound, 0).cx : simToCanvas(leftBound, 0).cx;
        const t = (extendX - objTip.cx) / dx;
        rays.push({
          x1: objTip.cx,
          y1: objTip.cy,
          x2: objTip.cx + dx * t,
          y2: objTip.cy + dy * t,
          dashed: false,
          color: rayColor + rayAlpha,
        });
      }
    }

    // Ray 3: Through near focal point → exits parallel
    const focalNear = simToCanvas(lens.position - f, 0);
    {
      // From object tip toward near focal point, then at lens exits parallel
      const dx = focalNear.cx - objTip.cx;
      const dy = focalNear.cy - objTip.cy;
      if (Math.abs(dx) > 0.1) {
        // Hit point on lens
        const tLens = (lensCenter.cx - objTip.cx) / dx;
        const hitY = objTip.cy + dy * tLens;

        rays.push({
          x1: objTip.cx,
          y1: objTip.cy,
          x2: lensCenter.cx,
          y2: hitY,
          dashed: false,
          color: rayColor + rayAlpha,
        });

        // Exits parallel to axis from hit point
        const exitX = simToCanvas(rightBound, 0).cx;
        rays.push({
          x1: lensCenter.cx,
          y1: hitY,
          x2: exitX,
          y2: hitY,
          dashed: false,
          color: rayColor + rayAlpha,
        });
      }
    }

    // Virtual image dashed extensions
    if (isVirtual) {
      // Extend rays backward as dashed lines to virtual image
      rays.push({
        x1: imgTip.cx,
        y1: imgTip.cy,
        x2: lensCenter.cx,
        y2: lensCenter.cy,
        dashed: true,
        color: rayColor + rayAlpha,
      });
    }

    totalMagnification *= magnification;
    currentObjPos = imagePos;
    currentObjHeight = imageHeight;
  }

  const finalImagePos = currentObjPos;
  const finalImageHeight = currentObjHeight;
  const lastLens = sortedLenses[sortedLenses.length - 1];
  const isReal = finalImagePos > lastLens.position;

  const image: ImageInfo = {
    objectId: obj.id,
    position: finalImagePos,
    height: finalImageHeight,
    magnification: totalMagnification,
    isReal,
    isUpright: finalImageHeight > 0 === obj.height > 0,
  };

  return { rays, image };
}

/**
 * Get default R1, R2 values for a lens type
 */
export function getDefaultRadii(type: Lens["type"], f: number): { r1: number; r2: number } {
  const absF = Math.abs(f);
  const R = absF; // simplified: equal radii for symmetric lenses
  switch (type) {
    case "biconvex":
      return { r1: R, r2: -R };
    case "biconcave":
      return { r1: -R, r2: R };
    case "plano-convex":
      return { r1: Infinity, r2: -R * 0.5 };
    case "plano-concave":
      return { r1: Infinity, r2: R * 0.5 };
    default:
      return { r1: R, r2: -R };
  }
}

/**
 * Get default focal length sign for a lens type
 */
export function getDefaultFocalLength(type: Lens["type"]): number {
  switch (type) {
    case "biconvex":
    case "plano-convex":
      return 100; // converging, positive
    case "biconcave":
    case "plano-concave":
      return -100; // diverging, negative
  }
}

/**
 * Determine if a lens type is converging
 */
export function isConverging(type: Lens["type"]): boolean {
  return type === "biconvex" || type === "plano-convex";
}

import type { Lens, LensObject, RaySegment, ImageInfo } from "@/components/lens-builder/types";

/**
 * Thin lens equation: 1/v - 1/u = 1/f
 * Convention: u is negative for real objects (left of lens), v positive for real images (right of lens)
 * Returns v (image distance from lens)
 */
export function thinLensImageDistance(u: number, f: number): number {
  const invV = 1 / f + 1 / u;
  if (Math.abs(invV) < 1e-10) return Infinity;
  return 1 / invV;
}

/**
 * Lensmaker's equation:
 * 1/f = (n-1) * [1/R1 - 1/R2 + (n-1)*d / (n*R1*R2)]
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
    return lensmakersEquation(lens.r1, lens.r2, lens.refractiveIndex, lens.thickness);
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
  const u = objectPos - lensPos;
  if (Math.abs(u) < 1e-6) {
    return { imagePos: objectPos, imageHeight: objectHeight, magnification: 1 };
  }
  const v = thinLensImageDistance(u, focalLength);
  if (!isFinite(v)) {
    return { imagePos: lensPos + 10000, imageHeight: 0, magnification: 0 };
  }
  const m = v / u;
  return { imagePos: lensPos + v, imageHeight: objectHeight * m, magnification: m };
}

/**
 * Snell's law refraction at a spherical surface (paraxial approximation).
 * Given incoming ray angle and height at the surface, compute outgoing angle.
 * n1*sin(theta1) = n2*sin(theta2) => paraxial: n1*theta1 = n2*theta2
 * At a spherical surface of radius R: theta_out = (n1/n2)*theta_in - (n2-n1)/(n2*R) * h
 */
export function refractAtSurface(
  angleIn: number,
  heightAtSurface: number,
  n1: number,
  n2: number,
  R: number
): number {
  if (!isFinite(R) || Math.abs(R) > 1e6) {
    // Flat surface
    return (n1 / n2) * angleIn;
  }
  return (n1 / n2) * angleIn - ((n2 - n1) / (n2 * R)) * heightAtSurface;
}

/**
 * Trace a single ray through a thick lens.
 * Returns intermediate points: [enter front surface, exit back surface]
 */
export function traceThickLensRay(
  rayHeight: number,
  rayAngle: number,
  lens: Lens
): { frontH: number; frontAngle: number; backH: number; backAngle: number } {
  const n = lens.refractiveIndex;
  const d = lens.thickness;
  const r1 = lens.r1;
  const r2 = lens.r2;

  // Refract at front surface (air → glass)
  const angleAfterFront = refractAtSurface(rayAngle, rayHeight, 1.0, n, r1);

  // Propagate through lens medium
  const heightAtBack = rayHeight + angleAfterFront * d;

  // Refract at back surface (glass → air)
  const angleAfterBack = refractAtSurface(angleAfterFront, heightAtBack, n, 1.0, r2);

  return {
    frontH: rayHeight,
    frontAngle: angleAfterFront,
    backH: heightAtBack,
    backAngle: angleAfterBack,
  };
}

/**
 * Trace rays through a multi-lens system for a given object.
 * Returns ray segments and ALL intermediate + final images.
 */
export function traceRays(
  obj: LensObject,
  lenses: Lens[],
  canvasWidth: number,
  canvasHeight: number,
  simToCanvas: (x: number, y: number) => { cx: number; cy: number },
): { rays: RaySegment[]; images: ImageInfo[] } {
  if (lenses.length === 0) return { rays: [], images: [] };

  const sortedLenses = [...lenses].sort((a, b) => a.position - b.position);
  const rays: RaySegment[] = [];
  const images: ImageInfo[] = [];
  const rayColor = obj.color;
  const rayAlpha = "66";

  let currentObjPos = obj.position;
  let currentObjHeight = obj.height;
  let totalMagnification = 1;

  for (let i = 0; i < sortedLenses.length; i++) {
    const lens = sortedLenses[i];
    const f = getEffectiveFocalLength(lens);

    const { imagePos, imageHeight, magnification } = computeImageThroughLens(
      currentObjPos, currentObjHeight, lens.position, f
    );

    const isVirtual = imagePos < lens.position;
    const leftBound = i === 0 ? -canvasWidth : sortedLenses[i - 1].position;
    const rightBound = i === sortedLenses.length - 1 ? canvasWidth : sortedLenses[i + 1].position;

    const objTip = simToCanvas(currentObjPos, currentObjHeight);
    const lensCenter = simToCanvas(lens.position, 0);
    const lensTop = simToCanvas(lens.position, currentObjHeight);

    const isThick = lens.thickLensMode && lens.allowDifferentCurvature;
    const halfThick = isThick ? lens.thickness / 2 : 0;
    const frontX = lens.position - halfThick;
    const backX = lens.position + halfThick;

    // Ray 1: Parallel to axis → through far focal point
    if (isThick) {
      const frontSurface = simToCanvas(frontX, currentObjHeight);
      // Ray to front surface
      rays.push({ x1: objTip.cx, y1: objTip.cy, x2: frontSurface.cx, y2: frontSurface.cy, dashed: false, color: rayColor + rayAlpha });
      // Trace through thick lens
      const traced = traceThickLensRay(currentObjHeight, 0, lens);
      const backSurface = simToCanvas(backX, traced.backH);
      // Through lens medium
      rays.push({ x1: frontSurface.cx, y1: frontSurface.cy, x2: backSurface.cx, y2: backSurface.cy, dashed: false, color: rayColor + "44" });
      // After back surface - extend using exit angle
      const exitPt = simToCanvas(backX, traced.backH);
      const farPt = simToCanvas(rightBound, traced.backH + traced.backAngle * (rightBound - backX));
      rays.push({ x1: exitPt.cx, y1: exitPt.cy, x2: farPt.cx, y2: farPt.cy, dashed: false, color: rayColor + rayAlpha });
    } else {
      // Thin lens: parallel ray
      rays.push({ x1: objTip.cx, y1: objTip.cy, x2: lensTop.cx, y2: lensTop.cy, dashed: false, color: rayColor + rayAlpha });

      const focalFar = simToCanvas(lens.position + f, 0);
      if (f > 0) {
        const dx = focalFar.cx - lensTop.cx;
        const dy = focalFar.cy - lensTop.cy;
        if (Math.abs(dx) > 0.1) {
          const extendX = dx > 0 ? simToCanvas(rightBound, 0).cx : simToCanvas(leftBound, 0).cx;
          const t = (extendX - lensTop.cx) / dx;
          rays.push({ x1: lensTop.cx, y1: lensTop.cy, x2: lensTop.cx + dx * t, y2: lensTop.cy + dy * t, dashed: false, color: rayColor + rayAlpha });
        }
      } else {
        const nearFocal = simToCanvas(lens.position + f, 0);
        const dx = lensTop.cx - nearFocal.cx;
        const dy = lensTop.cy - nearFocal.cy;
        if (Math.abs(dx) > 0.1) {
          const extendX = simToCanvas(rightBound, 0).cx;
          const t = (extendX - lensTop.cx) / dx;
          rays.push({ x1: lensTop.cx, y1: lensTop.cy, x2: lensTop.cx + dx * t, y2: lensTop.cy + dy * t, dashed: false, color: rayColor + rayAlpha });
          rays.push({ x1: lensTop.cx, y1: lensTop.cy, x2: nearFocal.cx, y2: nearFocal.cy, dashed: true, color: rayColor + rayAlpha });
        }
      }
    }

    // Ray 2: Through optical center → straight through
    if (isThick) {
      const u = currentObjPos - lens.position;
      const angle = currentObjHeight / (-u);
      const frontSurface = simToCanvas(frontX, currentObjHeight + angle * (frontX - currentObjPos));
      rays.push({ x1: objTip.cx, y1: objTip.cy, x2: frontSurface.cx, y2: frontSurface.cy, dashed: false, color: rayColor + rayAlpha });
      // Through center (approximately)
      const backSurface = simToCanvas(backX, currentObjHeight + angle * (backX - currentObjPos));
      rays.push({ x1: frontSurface.cx, y1: frontSurface.cy, x2: backSurface.cx, y2: backSurface.cy, dashed: false, color: rayColor + "44" });
      const farPt = simToCanvas(rightBound, currentObjHeight + angle * (rightBound - currentObjPos));
      rays.push({ x1: backSurface.cx, y1: backSurface.cy, x2: farPt.cx, y2: farPt.cy, dashed: false, color: rayColor + rayAlpha });
    } else {
      const dx = lensCenter.cx - objTip.cx;
      const dy = lensCenter.cy - objTip.cy;
      if (Math.abs(dx) > 0.1) {
        const extendX = dx > 0 ? simToCanvas(rightBound, 0).cx : simToCanvas(leftBound, 0).cx;
        const t = (extendX - objTip.cx) / dx;
        rays.push({ x1: objTip.cx, y1: objTip.cy, x2: objTip.cx + dx * t, y2: objTip.cy + dy * t, dashed: false, color: rayColor + rayAlpha });
      }
    }

    // Ray 3: Through near focal point → exits parallel
    if (isThick) {
      const focalNear = lens.position - f;
      const angle = currentObjHeight / (currentObjPos - focalNear);
      const hAtFront = currentObjHeight + angle * (frontX - currentObjPos);
      const frontSurface = simToCanvas(frontX, hAtFront);
      rays.push({ x1: objTip.cx, y1: objTip.cy, x2: frontSurface.cx, y2: frontSurface.cy, dashed: false, color: rayColor + rayAlpha });
      // Through thick lens — exits parallel
      const traced = traceThickLensRay(hAtFront, angle, lens);
      const backSurface = simToCanvas(backX, traced.backH);
      rays.push({ x1: frontSurface.cx, y1: frontSurface.cy, x2: backSurface.cx, y2: backSurface.cy, dashed: false, color: rayColor + "44" });
      // Exit parallel
      const exitX = simToCanvas(rightBound, 0).cx;
      rays.push({ x1: backSurface.cx, y1: backSurface.cy, x2: exitX, y2: backSurface.cy, dashed: false, color: rayColor + rayAlpha });
    } else {
      const focalNear = simToCanvas(lens.position - f, 0);
      const dx = focalNear.cx - objTip.cx;
      const dy = focalNear.cy - objTip.cy;
      if (Math.abs(dx) > 0.1) {
        const tLens = (lensCenter.cx - objTip.cx) / dx;
        const hitY = objTip.cy + dy * tLens;
        rays.push({ x1: objTip.cx, y1: objTip.cy, x2: lensCenter.cx, y2: hitY, dashed: false, color: rayColor + rayAlpha });
        const exitX = simToCanvas(rightBound, 0).cx;
        rays.push({ x1: lensCenter.cx, y1: hitY, x2: exitX, y2: hitY, dashed: false, color: rayColor + rayAlpha });
      }
    }

    // Virtual image dashed extensions
    if (isVirtual) {
      const imgTip = simToCanvas(imagePos, imageHeight);
      rays.push({ x1: imgTip.cx, y1: imgTip.cy, x2: lensCenter.cx, y2: lensCenter.cy, dashed: true, color: rayColor + rayAlpha });
    }

    totalMagnification *= magnification;

    // Record intermediate image
    const lastLens = sortedLenses[sortedLenses.length - 1];
    images.push({
      objectId: obj.id,
      lensIndex: i,
      position: imagePos,
      height: imageHeight,
      magnification: totalMagnification,
      isReal: i === sortedLenses.length - 1 ? imagePos > lastLens.position : imagePos > lens.position,
      isUpright: imageHeight > 0 === obj.height > 0,
    });

    currentObjPos = imagePos;
    currentObjHeight = imageHeight;
  }

  return { rays, images };
}

/**
 * Get default R1, R2 values for a lens type
 */
export function getDefaultRadii(type: Lens["type"], f: number): { r1: number; r2: number } {
  const absF = Math.abs(f);
  const R = absF;
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
      return 100;
    case "biconcave":
    case "plano-concave":
      return -100;
  }
}

/**
 * Determine if a lens type is converging
 */
export function isConverging(type: Lens["type"]): boolean {
  return type === "biconvex" || type === "plano-convex";
}

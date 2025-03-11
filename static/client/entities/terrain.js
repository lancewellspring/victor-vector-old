export const terrainGenerator = {
  
  createNoise() {
    const p = new Array(512);
    const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];

    // Extend with repeating values
    for (let i = 0; i < 256; i++) {
      p[i] = permutation[i];
      p[256 + i] = permutation[i];
    }

    function fade(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function grad(hash, x) {
      const h = hash & 15;
      const grad = 1 + (h & 7);
      return (h & 8 ? -grad : grad) * x;
    }

    return function(x) {
      const X = Math.floor(x) & 255;
      x -= Math.floor(x);
      const u = fade(x);

      const a = p[X];
      const b = p[X + 1];

      return (grad(a, x) + (grad(b, x) - grad(a, x)) * u) / 8;
    };
  },

  smoothPath(points, radius = .5) {
    // Find points where slope changes significantly
    const changes = [];
    for (let i = 1; i < points.length - 1; i++) {
      const prevSlope = (points[i].y - points[i-1].y) / (points[i].x - points[i-1].x);
      const nextSlope = (points[i+1].y - points[i].y) / (points[i+1].x - points[i].x);

      if (Math.sign(prevSlope) !== Math.sign(nextSlope) && 
          Math.abs(prevSlope - nextSlope) > 0.01) {
        changes.push(i);
      }
    }

    // Add smoothing points around slope changes
    let smoothedPoints = [...points];
    let offset = 0; // Track how many points we've added

    changes.forEach(idx => {
      const actualIdx = idx + offset;
      const point = smoothedPoints[actualIdx];
      const prev = smoothedPoints[actualIdx - 1];
      const next = smoothedPoints[actualIdx + 1];

      // Create control points before and after the peak/valley
      const controlBefore = {
        x: point.x - radius * (point.x - prev.x),
        y: point.y - radius * (point.y - prev.y),
        z: point.z - radius * (point.z - prev.z)
      };

      const controlAfter = {
        x: point.x + radius * (next.x - point.x),
        y: point.y + radius * (next.y - point.y),
        z: point.z + radius * (next.z - point.z)
      };

      // Insert the new points
      smoothedPoints.splice(actualIdx, 0, controlBefore);
      //smoothedPoints.splice(actualIdx + 2, 0, controlAfter);
      smoothedPoints[actualIdx + 1] = controlAfter;
      offset += 1; // We added two points
    });

    return smoothedPoints;
  },

  generatePath (noise, width, segments, params={}) {    
    params.yoctaves = params.yoctaves || 3;
    params.ybaseFreq = params.ybaseFreq ||  0.01;
    params.ypersistence = params.ypersistence ||  0.9;
    params.yamplitude = params.yamplitude ||  40;
    params.ymaxSlope = params.ymaxSlope ||  0.2;
    params.ysmoothing = params.ysmoothing ||  0.2;
    params.yedgeFading = params.yedgeFading ||  true;
    params.xoctaves = params.xoctaves ||  2;
    params.xbaseFreq = params.xbaseFreq ||  0.03;
    params.xpersistence = params.xpersistence ||  0.7;
    params.xamplitude = params.xamplitude ||  5;
    params.xmaxSlope = params.xmaxSlope ||  0.1;
    params.xsmoothing = params.xsmoothing ||  0.2;
    params.smooth = (params.smooth) ? true : false;
    const points = [];
    let prevY = 0;
    let prevZ = 0;
    let yr = (Math.random() - .5) * 1000;
    let zr = (Math.random() - .5) * 1000;

    for (let i = 0; i < segments; i++) {
      const x = (i / (segments - 1)) * width;
      let z = 0;
      let y = 0;

      // Sum multiple octaves
      for (let oct = 0; oct < params.yoctaves; oct++) {
        const freq = params.ybaseFreq * Math.pow(2, oct);
        const amp = params.yamplitude * Math.pow(params.ypersistence, oct);
        y += noise((x + yr) * freq) * amp;
      }
      for (let oct = 0; oct < params.xoctaves; oct++) {
        const freq = params.xbaseFreq * Math.pow(2, oct);
        const amp = params.xamplitude * Math.pow(params.xpersistence, oct);
        z += noise((x + zr) * freq + 1000) * amp;
      }

      // Apply slope constraints
      if (i > 0) {
        const dx = width / segments;
        const dy = y - prevY;
        const slope = Math.abs(dy / dx);

        if (slope > params.ymaxSlope) {
          const maxDy = params.ymaxSlope * dx * Math.sign(dy);
          y = prevY + maxDy;
        }

        const dz = z - prevZ;
        const zSlope = Math.abs(dz / dx);
        if (zSlope > params.xmaxSlope) {
          const maxDz = params.xmaxSlope * dx * Math.sign(dx);
          z = prevZ + maxDz;
        }
      }

      const jitterY = (Math.random() - 0.5) * (width / segments) * 0.5;
      const jitterZ = (Math.random() - 0.5) * (width / segments) * 0.5;
      y += jitterY;
      z += jitterZ;

      //this makes y end close to where it started
      if(params.yedgeFading){
        // Smooth transitions at edges
        const edgeFade = Math.min(
          i / (segments * 0.2),
          (segments - i) / (segments * 0.2)
        );
        y *= Math.min(1, edgeFade);
      }

      // Apply smoothing
      y = y * (1 - params.ysmoothing) + (prevY || y) * params.ysmoothing;
      z = z * (1 - params.xsmoothing) + (prevZ || z) * params.xsmoothing;

      points.push({ x: x, y: y, z:z }); // Center vertically
      prevY = y;
      prevZ = z;
    }

    return (params.smooth) ? this.smoothPath(points) : points;
  }
}
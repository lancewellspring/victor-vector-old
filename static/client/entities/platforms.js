let Vector3 = THREE.Vector3;
export const platforms = {
  
  init(){
    this.SEED = Date.now();
    this.M = Math.floor(Math.random() * 10000);
    this.P = Math.floor(Math.random() * 10);
    this.RockMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      flatShading: true,
      shininess: 0
    });
  },

  /*examples
  // Generate points for a basic round rock
const roundRockPoints = generateRockPoints(20, 1);

// Generate points for a flatter rock like a slate
const flatRockPoints = generateRockPoints(20, 1, { flatness: 0.7 });

// Generate points for a sharp, angular rock
const angularRockPoints = generateRockPoints(25, 1, { angularity: 0.8 });

// Generate points for an elongated rock
const elongatedRockPoints = generateRockPoints(20, 1, { 
  elongation: { x: 1.8, y: 0.7, z: 1.2 } 
});
  /*
    /**
   * Generates random points within a spherical volume to create a rock base
   * @param {number} count Number of points to generate
   * @param {number} radius Base radius of the sphere
   * @param {Object} options Additional configuration options
   * @returns {Array<Vector3>} Array of Vector3 points
   */
  generateRockPoints(count = 20, radius = 1, options = {}) {
    const {
      jitter = 5,                // Random displacement amount
      flatness = 0,                // 0-1 value to flatten along Y axis
      angularity = 0,              // 0-1 value to add more edge points
      elongation = { x: 1.2, y: 1, z: 1 } // Scale factors for each axis
    } = options;

    const points = [];

    // Generate core points within the sphere
    for (let i = 0; i < count; i++) {
      // Create random point using spherical coordinates
      const theta = Math.random() * Math.PI * 2; // Angle around Y axis
      const phi = Math.acos((Math.random() * 2) - 1); // Angle from Y axis
      const r = radius * Math.pow(Math.random(), 0.33); // Cube root for uniform distribution

      // Convert to Cartesian coordinates
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      // Apply elongation factors
      const point = new Vector3(
        x * elongation.x, 
        y * elongation.y, 
        z * elongation.z
      );

      // Apply flattening if specified
      if (flatness > 0) {
        point.y *= (1 - flatness);
      }

      // Add random jitter
      point.x += (Math.random() - 0.5) * jitter;
      //make the top flatter
      point.y += Math.min((Math.random() - 0.5) * jitter, radius*.6);
      point.z += (Math.random() - 0.5) * jitter;

      points.push(point);
    }

    // Add angular corner points if angularity > 0
    if (angularity > 0) {
      // Number of extra angular points to add
      const angularPoints = Math.floor(count * angularity * 0.5);
      const directions = [
        new Vector3(1, 1, 1), new Vector3(-1, 1, 1),
        new Vector3(1, -1, 1), new Vector3(-1, -1, 1),
        new Vector3(1, 1, -1), new Vector3(-1, 1, -1),
        new Vector3(1, -1, -1), new Vector3(-1, -1, -1)
      ];

      // Add points in corner directions
      for (let i = 0; i < angularPoints; i++) {
        const dir = directions[i % directions.length].clone().normalize();
        const distance = radius * (0.8 + Math.random() * 0.4); // 80-120% of radius

        const point = dir.multiplyScalar(distance);

        // Apply elongation
        point.x *= elongation.x;
        point.y *= elongation.y;
        point.z *= elongation.z;

        // Apply flattening
        if (flatness > 0) {
          point.y *= (1 - flatness);
        }

        // Add some jitter to corners
        point.x += (Math.random() - 0.5) * jitter * 0.5;
        point.y += (Math.random() - 0.5) * jitter * 0.5;
        point.z += (Math.random() - 0.5) * jitter * 0.5;

        points.push(point);
      }
    }

    return points;
  },
  
  /**
   * Creates a complete rock mesh with geometry and material
   * @param {Array<Vector3>} points Points to create the rock from, or options to generate points
   * @param {Object} materialOptions Options for the rock material
   * @returns {Mesh} The complete rock mesh
   */
  createRock(points, materialOptions = {}) {
    // If points weren't provided or an options object was passed instead,
    // generate the points
    const options = points || {};
    if (!Array.isArray(points)) {
      points = this.generateRockPoints(
        options.count || 80,
        options.radius || 20,
        options
      );
    }

    // Create the geometry
    const geometry = new THREE.ConvexGeometry(points);
    geometry.points = points;
  
    // Compute vertex normals for proper lighting
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Create the material with default options that can be overridden
    const material = new THREE.MeshStandardMaterial({
      color: materialOptions.color || 0x777777,
      roughness: materialOptions.roughness !== undefined ? materialOptions.roughness : 0.8,
      metalness: materialOptions.metalness !== undefined ? materialOptions.metalness : 0.1,
      flatShading: true,
      ...materialOptions
    });

    // Create and return the mesh
    const rockMesh = new THREE.Mesh(geometry, material);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    
    if(options.x){
      rockMesh.position.set(options.x, options.y, options.z);
    }    

    return rockMesh;
  }
}
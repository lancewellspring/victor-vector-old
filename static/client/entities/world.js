import { sceneManager } from '../scene.js';
import { terrainGenerator } from './terrain.js';
import { platforms } from './platforms.js';

const uniforms = {
    baseColor: { value: new THREE.Vector3(0.2, 0.5, 0.2) },
    lightColor: { value: new THREE.Vector3(1.0, 1.0, 0.9) },
    lightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.2).normalize() },
    heightRange: { value: 10.0 },
    facetSpread: { value: .0015 } // Adjust this to control pattern size
};
var vShader = `// Vertex shader
varying vec3 vNormal;
varying vec3 vPosition;
varying float vAlpha;  
attribute float alpha; 

void main() {
    // Pass the normal and position to fragment shader
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vAlpha = alpha;    // Pass alpha to fragment shader
    // Standard vertex transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying float vAlpha; 
uniform vec3 baseColor;
uniform vec3 lightColor;
uniform vec3 lightDirection;
uniform float heightRange;
uniform float facetSpread;

// Add better hash function for more random distribution
vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.8975,397.2973, 491.1871));
    p += dot(p.zxy, p.yxz+19.19);
    return fract(vec3(p.x * p.y, p.y * p.z, p.z * p.x));
}

void main() {
    // Keep the excellent faceted normal calculation
    vec3 xTangent = dFdx(vPosition);
    vec3 yTangent = dFdy(vPosition);
    vec3 facetedNormal = normalize(cross(xTangent, yTangent));
    
    // Calculate lighting
    float diffuse = max(0.0, dot(facetedNormal, normalize(lightDirection)));
    
    // Height-based color variation (keep this)
    float height = (vPosition.y + heightRange) / (2.0 * heightRange);
    vec3 color = mix(baseColor * 0.8, baseColor * 1.2, height);
    
    // New improved variation calculation
    vec3 pos = vPosition * facetSpread;
    vec3 hashValue = hash33(floor(pos));
    float variation = hashValue.x; // Use just one component for now
    
    // Apply variation with slightly reduced range for subtlety
    color = mix(color * 0.95, color * 1.05, variation);
    
    // Apply lighting (keep this)
    vec3 finalColor = color * (diffuse * lightColor + 0.2);
    
    gl_FragColor = vec4(finalColor, vAlpha);
}`;

export const worldManager = {
    init(scene) {
        this.PATH_SEGMENT_LENGTH = 100;
      
        this.scene = scene;
        this.platforms = [];

        // Add platforms
        // const platforms = this.createMiddleLayer();
        // this.platforms.push(...platforms);
        // platforms.forEach(platform => this.scene.add(platform));
      
        const points = this.generateGroundPath(10000);

        this.groundMesh = this.createGroundMesh(points);
        //this.platforms.push(this.groundMesh);
        this.scene.add(this.groundMesh);
      
        for(let i = 0; i < 10000;){
          i += Math.max(Math.random(), .3) * 250;
          let ground = this.getGroundHeightAt(i);
          if(ground){
            let r = Math.max(Math.random(), .3);
            let radius = 40*r;
            let rock = platforms.createRock({x:i, y:ground.y-10, z:ground.z, radius: 40*r, count:80*r});
            this.platforms.push(rock);
            
            let size = rock.geometry.boundingBox.getSize();            
            rock.position.y += size.y/2;         
            //rock.position.z -= size.z/2;
            rock.geometry.parameters = {width:size.x, height:size.y};
            
            //const box = new THREE.BoxHelper( rock, 0xff0000 );
            //scene.add( box );
            scene.add(rock);
          }
        }
    },

    createMiddleLayer() {
        const platforms = [];

        // Create platforms at different depths for parallax effect
        const platformConfigs = [
            { x: 0, y: 20, z: 0, width: 120, height: 20, color: 0x557755 },
            { x: 200, y: 40, z: 0, width: 120, height: 20, color: 0x668866 },
            { x: 400, y: 60, z: 0, width: 120, height: 20, color: 0x779977 }
        ];

        platformConfigs.forEach(config => {
            const platform = this.createBasicPlatform(
                config.x, config.y, 
                config.width, config.height,
                config.color
            );
            platform.position.z = config.z;
            platforms.push(platform);
        });

        return platforms;
    },

    createBasicPlatform(x, y, width, height, color = 0x88aa44) {
        const geometry = new THREE.BoxGeometry(width, height, 20);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.9,
            // Add slight shininess for better depth perception
            shininess: 30
        });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, 0);

        // Add a subtle shadow material on the bottom
        const shadowGeometry = new THREE.BoxGeometry(width, 2, 25);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.2
        });
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.position.y = -height/2;
        platform.add(shadow);

        return platform;
    },
  
  
  generateGroundPath(length){
    const segments = length / this.PATH_SEGMENT_LENGTH; 
    const noise = terrainGenerator.createNoise();
    const points = terrainGenerator.generatePath(noise, length, segments, {xmaxslope:.9, xamplitude:800, xbaseFreq:.001, xoctaves:1});
    console.log(points);
    return points;
  },
  
  
  /**
 * Creates a Three.js mesh for a ground segment from 2D points
 * @param {Array<{x: number, y: number}>} points - Array of 2D points
 * @param {Object} options
 * @param {number} options.depth - Depth of the ground segment (z-axis)
 * @param {number} options.segments - Number of depth segments
 * @param {THREE} THREE - Three.js instance
 * @returns {THREE.Mesh} Ground segment mesh
 */
createGroundMesh(points, depth = 240, segments = 5) {
  // Create geometry
  const geometry = new THREE.BufferGeometry();
  
  // Generate 3D vertices by extending 2D points along Z axis
  const vertices = [];
  const normals = [];
  const uvs = [];
  const alphas = []; // For transparency
  const vertexMap = new Map(); // To track vertex indices
  
  // Create vertices for both front and back faces
  points.forEach((point, i) => {
    const t = i / (points.length - 1); // Normalized position for UV
    
    // Generate vertices along z-depth with multiple segments
    for (let z = 0; z <= segments; z++) {
      let tz = z / segments;
      // Use quadratic falloff for more natural bulging
      let bulge = -20 + (1 - Math.pow(2 * tz - 1, 2)) * 20;
      const zPos = tz * depth - (depth / 2) + (i%2) * depth/segments/4;
      let yjitter = (Math.random() - 0.5) * 2;
      let zjitter = (Math.random() - 0.5) * 2;

      // Store vertex
      vertices.push(point.x, point.y + bulge + yjitter, point.z + zPos + zjitter);
      
      // UV coordinates
      uvs.push(
        t, tz
      );
      
      // Alpha values for edge fading
      // Fade at front and back edges of z-axis
      const zAlpha = .5 + Math.sin(tz * Math.PI) * .5;
      // Fade at left and right edges of x-axis
      const xAlpha = 1.0;//Math.sin((i / (points.length - 1)) * Math.PI);
      alphas.push(Math.min(zAlpha, xAlpha));
      
      // Create mapping key that preserves path topology
      const key = `${i}_${z}`;
      vertexMap.set(key, vertices.length / 3 - 1);
    }
  });
  

  var indices = [];
  for (let i = 0; i < points.length - 1; i++) {
      for (let z = 0; z < segments; z++) {
          // Get vertex indices for this quad
          const v0 = vertexMap.get(`${i}_${z}`);
          const v1 = vertexMap.get(`${i}_${z + 1}`);
          const v2 = vertexMap.get(`${i + 1}_${z}`);
          const v3 = vertexMap.get(`${i + 1}_${z + 1}`);

          // Create two triangles for the quad
          indices.push(v0, v2, v1);
          indices.push(v1, v2, v3);
      }
  }

  // Set geometry attributes
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  geometry.setAttribute(
    'alpha',
    new THREE.Float32BufferAttribute(alphas, 1)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshPhongMaterial({ //THREE.ShaderMaterial
    transparent: true,
    color: 0x33AA33,
    side: THREE.DoubleSide, 
    flatShading: true,
    //uniforms:uniforms,
    //vertexShader:vShader,
    //fragmentShader:fShader
  });
  
  // Find the actual bounds of our ground mesh
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  
  // Create collision box
  const collisionGeometry = new THREE.BoxGeometry(
    maxX - minX,
    maxY - minY,
    depth
  );
  const collisionMaterial = new THREE.MeshBasicMaterial({
    visible: false
  });
  const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
  
  // Position collision box correctly
  collisionMesh.position.set(
    (maxX + minX) / 2,
    (maxY + minY) / 2,
    0
  );
  
  var mesh = new THREE.Mesh(geometry, material);
  
  // Add collision mesh as a child
  mesh.add(collisionMesh);
  
  // Add required parameters for collision detection
  mesh.geometry.parameters = {
    width: maxX - minX,
    height: maxY - minY
  };
  
  // Store actual ground points for more precise collision if needed
  mesh.groundPoints = points;
  mesh.isGround = true;  // Flag to identify ground meshes

  return mesh;
},
  
/**
 * Gets height of ground mesh at given x position
 * @param {THREE.Mesh} groundMesh - Ground mesh with groundPoints
 * @param {number} x - X position to check
 * @returns {number|null} Height at position or null if out of bounds
 */
getGroundHeightAt(x) {
    const points = this.groundMesh.groundPoints;
    
    // Find the two closest points
    let i = 0;
    while (i < points.length - 1 && points[i + 1].x < x) {
        i++;
    }
    
    // If x is outside our ground bounds, return null
    if (i >= points.length - 1 || i < 0) return null;
    
    // Interpolate between the two closest points
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const t = (x - p1.x) / (p2.x - p1.x);
    return {y:p1.y + (p2.y - p1.y) * t, z:p1.z};
},
  
    // Add method for camera following
    update(playerPosition) {
      if (playerPosition) {
          //console.log('World update - Player position:', playerPosition);
          
      }
    }
}
import { terrainGenerator } from "./terrain.js";

function bgMaterial(baseColor) {
  const hColor = new THREE.Color(baseColor);
  hColor.multiplyScalar(.93);
  const sColor = new THREE.Color(baseColor);
  sColor.multiplyScalar(0.86);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(baseColor).toArray() }, //new THREE.Color('#4E8E4E') },
      highlightColor: { value: new THREE.Color(hColor).toArray() }, //new THREE.Color('#6EAE6E') },
      shadowColor: { value: new THREE.Color(sColor).toArray() }, //new THREE.Color('#2E6E2E') },,
      depth: { value: 0.0 },
      steps: { value: 3.0 },
      time: { value: 0.0 },
    },
    side: THREE.DoubleSide, 
    flatShading: false,
    shininess: 0,
    vertexShader: `
    uniform float time;
    varying vec3 vNormal;
    varying float vHeight;
    varying float vDepth;
    
    void main() {
        vec3 pos = position;
        
        // Basic wave - made slightly stronger
        float wave = sin(pos.x * 0.01 + time * 0.5) * 5.0;
        
        // Wind effect - increased strength and made more noticeable at peaks
        float windStrength = smoothstep(-200.0, 200.0, position.y) * 8.0; // Increased from 2.0 to 8.0
        float wind = sin(pos.x * 0.015 + time * 0.4 + pos.y * 0.01) * windStrength;
        
        // Breathing - made stronger and more obvious
        float breath = sin(time * 0.2) * 10.0 * smoothstep(-300.0, 300.0, position.y);
        
        // Combine effects
        pos.x += wind;
        pos.y += wave + breath;
        
        vNormal = normal;
        vHeight = pos.y;
        vDepth = -(modelViewMatrix * vec4(pos, 1.0)).z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`,
    fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 highlightColor;
    uniform vec3 shadowColor;
    uniform vec3 fogColor;
    uniform float depth;
    uniform float steps;
    uniform float time;
    
    varying vec3 vNormal;
    varying float vHeight;
    varying float vDepth;
    
    void main() {
        // Improved height factor with more pronounced transition
        float heightFactor = smoothstep(-500.0, 500.0, vHeight);
        
        // Enhanced lighting calculation with ambient occlusion
        vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
        float diffuse = max(0.0, dot(normalize(vNormal), lightDir));
        
        // Create stepped lighting for the terraced effect
        float steppedLight = ceil(diffuse * steps) / steps;
        
        // Add edge detection to emphasize steps
        float normalEdge = length(fwidth(vNormal)) * 2.0;
        float heightEdge = length(fwidth(vHeight)) * 15.0;
        float edgeFactor = clamp(normalEdge + heightEdge, 0.0, 1.0);
        
        // Add subtle color pulsing
        float pulse = sin(time * 0.3) * 0.1;
        vec3 pulsedBase = baseColor * (1.0 + pulse);
        
        // Combine colors with edge emphasis
        vec3 color = mix(shadowColor, pulsedBase, steppedLight);
        color = mix(color, shadowColor * 0.8, edgeFactor); // Darken edges
        color = mix(color, highlightColor, heightFactor);
        
        // Improved fog calculation with depth variance
        float fogFactor = smoothstep(0.0, 1000.0, vDepth + depth);
        color = mix(color, fogColor, fogFactor * 0.3);
        
        gl_FragColor = vec4(color, 1.0);
    }
`,
  });
  return mat;
}

class BackgroundLayer {
  constructor(scene, x, y, z, width, height, baseColor, rate, params) {
    this.scene = scene;
    this.depth = z;
    this.baseColor = baseColor;
    this.rate = rate;
    this.position = { x: x, y: y };
    this.meshes = []; // Store Three.js meshes
    this.params = params;
    this.width = width;
    this.height = height;
    this.generate();
  }

  generate() {
    // Clear existing meshes from scene
    //this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes = [];

    const noise = terrainGenerator.createNoise();
    const points = terrainGenerator.generatePath(
      noise,
      this.width,
      100,
      this.params
    );
    
    const vertices = [];
    const vertexMap = new Map(); // To track vertex indices
    var segments = 15;
    var thickness = 300;
    var drop = 600;
    if(this.params.smooth){
      segments = 5;
      thickness = 300;
      drop = 666;
    }
    
    points.forEach((point, i) => {
      for (let z = 0; z <= segments; z++) {        
        let zPos = z / segments * thickness;
        let yPos = z / segments * drop * (.8 + Math.random() * .2);
        //if(!this.params.smooth) yPos = yPos * (.8 + Math.random() * .2);
        vertices.push(point.x, point.y - yPos, -zPos);
        // Create mapping key that preserves path topology
        const key = `${i}_${z}`;
        vertexMap.set(key, vertices.length / 3 - 1);
      }
      vertices.push(point.x, -this.height, -thickness);
      vertexMap.set(`${i}_${segments}`, vertices.length / 3 - 1);
    });
    let pointsEnd = points.length - 1;
    let vertsEnd = vertices.length/3 - 1;
    vertices.push(points[pointsEnd].x, -this.height, -thickness); //near botright
    vertices.push(points[0].x, -this.height, -thickness); //near botleft
    vertices.push(points[0].x, -this.height, 0); //far botleft
    vertices.push(points[pointsEnd].x, -this.height, 0); //far botright
    
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
    //indices.push(vertsEnd, vertsEnd+1, vertsEnd+2);
    //indices.push(segments-1, vertsEnd, vertsEnd+2);
    
    const geometry = new THREE.BufferGeometry();
      // Set geometry attributes
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Convert points to Three.js shape
//     const shape = new THREE.Shape();

//     // Start at first point
//     shape.moveTo(points[0].x, points[0].y);

//     // Create curves through points
//     for (let i = 1; i < points.length; i++) {
//       shape.lineTo(points[i].x, points[i].y);
//     }

//     // Close the shape
//     shape.lineTo(points[points.length - 1].x, -this.height);
//     shape.lineTo(points[0].x, -this.height);
//     shape.closePath();
        
//     // Create the geometry and material
//     const geometry = new THREE.ShapeGeometry(shape);
    //const material = bgMaterial(this.baseColor);
      var material;
      if(this.params.smooth){        
        material = new THREE.MeshStandardMaterial({
          color: this.baseColor,
          roughness:  0.8,
          metalness:  0,
          flatShading: true,      
          side: THREE.DoubleSide, 
          vertexColors: false,
          displacementScale: 2.0,
          normalScale: new THREE.Vector2(1.0, 1.0)
        });
      }
      else{
        material = new THREE.MeshStandardMaterial({
          color: this.baseColor,
          roughness:  0.9,
          metalness:  0,
          flatShading: true,      
          side: THREE.DoubleSide, 
          vertexColors: false,

          // These parameters help soften the transitions between faces
          dithering: true,    // Applies dithering to smooth color bands
          shadowSide: THREE.FrontSide,

          // Optional: consider adding a subtle normal map 
          // to slightly break up the perfect flatness
          normalScale: new THREE.Vector2(0.3, 0.3)
        });
      }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = this.position.x;
    mesh.position.y = this.position.y;
    mesh.position.z = this.depth;

    this.meshes.push(mesh);
    this.scene.add(mesh);
  }

  update(cameraX, cameraY) {
    // Update mesh positions based on camera
    this.meshes.forEach((mesh) => {
      // Scale movement by the same factor as the mesh
      mesh.position.x = this.position.x - cameraX * this.rate;

      // Reduce vertical parallax and scale
      mesh.position.y = this.position.y - cameraY * this.rate / 10;

      //mesh.material.uniforms.time.value += 0.01;
    });
  }
}

export class BackgroundManager {
  constructor() {
    this.layers = [];
    this.init();
    this.initializeLayers();
  }

  init() {
    // Create background scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      1,
      1000
    );
    this.camera.position.z = 0;
    
    const ambient = new THREE.AmbientLight(0xccccff, 0.6);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(500, 1000, 300);
    this.scene.add(directional);
    
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    this.scene.add(hemiLight);

    // Handle resize
    window.addEventListener("resize", () => this.onWindowResize());
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
  }

  initializeLayers() {
   

    // Adjust layer positions and scales
    this.layers = [
      new BackgroundLayer(
        this.scene,
        -1000,
        150,
        -700,
        3000,
        1000,
        "#DEEEDE",
        0.1,
        {
          yedgeFading: false,
          yamplitude: 1200,
          ybaseFreq: 0.001,
          yoctaves: 1,
          ymaxSlope: 1,
          ysmoothing: 0,
          smooth: false,
        }
      ),
      new BackgroundLayer(
        this.scene,
        -1000,
        70,
        -400,
        6000,
        1000,
        "#BECEBE",
        0.2,
        {
          yedgeFading: false,
          yamplitude: 700,
          ybaseFreq: 0.001,
          yoctaves: 1,
          ymaxSlope: 0.8,
          ysmoothing: 0,
          smooth: false,
        }
      ),
      new BackgroundLayer(
        this.scene,
        -1000,
        -200,
        -100,
        12000,
        1000,
        "#8ECE8E",
        0.4,
        {
          yamplitude: 400,
          ybaseFreq: 0.01,
          yoctaves: 1,
          ymaxSlope: 0.4,
          ysmoothing: 0.5,
          smooth: true,
        }
      ),
    ];
    
    // const boxGeometry = new THREE.BoxGeometry(100, 100, 100);
    // const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // const debugBox = new THREE.Mesh(boxGeometry, boxMaterial);
    // debugBox.position.set(0, -50, -550); // Position at same z as middle layer
    // this.scene.add(debugBox);
  }

  update(cameraX, cameraY) {
    this.layers.forEach((layer) => layer.update(cameraX, cameraY));
  }
}

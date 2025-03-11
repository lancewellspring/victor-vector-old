

export const sceneManager = {
    scene: null,
    camera: null,
    renderer: null,
    light: null,

    init() {
        console.log('Initializing scene');
        this.scene = new THREE.Scene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        window.addEventListener('resize', () => this.handleResize());
        console.log('Scene initialization complete');
        this.rotating = false;
    },

    setupCamera() {
      const aspect = window.innerWidth / window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

      // Position the camera for side-view with depth
      this.camera.position.set(0, 200, 300);  // Higher Y gives slight downward angle
      this.camera.lookAt(0, 100, 0);

      // Store offset from player for consistent following
      this.cameraOffset = new THREE.Vector3(0, 200, 300);
    },

    updateCameraPosition(playerPosition) {
        if (!playerPosition || this.rotating) return;      

        // Create target position
        const targetPosition = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + this.cameraOffset.y,
            this.cameraOffset.z
        );

        // Smoothly interpolate camera position
        this.camera.position.lerp(targetPosition, 0.1);

        // Look slightly ahead of player
        const lookAtPosition = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 150,
            0
        );
        this.camera.lookAt(lookAtPosition);
      
        //this.backgroundManager.update(targetPosition.x, targetPosition.y);
    },
  
    rotateCamera(playerPosition){
        if (!playerPosition) return;

        // Create target position
        const targetPosition = new THREE.Vector3(
            playerPosition.x - this.cameraOffset.z,
            playerPosition.y + this.cameraOffset.y,
            playerPosition.z
        );

        // Smoothly interpolate camera position
        this.camera.position.lerp(targetPosition, 0.1);

        // Look slightly ahead of player
        const lookAtPosition = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y,
            playerPosition.z
        );
        this.camera.lookAt(lookAtPosition);
    },

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
    },

    setupLighting() {
        // Ambient light for base visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Main directional light (like sun)
        // this.mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        // this.mainLight.position.set(50, 100, 50);
        // this.mainLight.target.position.set(0, 0, 0);
        // this.scene.add(this.mainLight);
        // this.scene.add(this.mainLight.target);
      
        // Key light (main directional light)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(1, 2, 3);

        // Fill light (softer, from opposite side)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-2, 1, -1);
        this.scene.add(keyLight);
        this.scene.add(fillLight);

        // Add subtle fog for depth perception
        // this.scene.fog = new THREE.Fog(
        //     0x87CEEB,  // Sky blue color
        //     300,       // Near - when fog starts
        //     800        // Far - when fog is fully opaque
        // );

        // Set background color to match fog
        this.renderer.setClearColor(0x87CEEB);
    },

    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
};
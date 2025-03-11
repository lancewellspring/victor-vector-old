import { sceneManager } from '../scene.js';

export const playerManager = {
    players: new Map(),
    myPlayerId: null,
    HORIZONTAL_ACCELERATION: 0.3, // Less control in air
    HORIZONTAL_AIR_ACCELERATION: 0.1, // Less control in air
    JUMP_FORCE: 6,
    MAX_HORIZONTAL_SPEED: 5,
    GRAVITY: .5,

    createPlayerCube(id) {
        console.log('Creating cube for player:', id);
        const geometry = new THREE.BoxGeometry(20, 20, 20); 
        const material = new THREE.MeshPhongMaterial({ 
            color: id === this.myPlayerId ? 0x00ff00 : 0xff0000 
        });
        const cube = new THREE.Mesh(geometry, material);
        
        // Initial position
        cube.position.set(0, 20, 0);
        cube.rotation.x = 0.5;
        cube.rotation.y = 0.5;
        
        console.log('Adding cube to scene');
        sceneManager.scene.add(cube);
        cube.velocity = new THREE.Vector3();
        cube.grounded = true;
        return cube;
    },

    addPlayer(id) {
        console.log('Adding player:', id);
        if (!this.players.has(id)) {
            const cube = this.createPlayerCube(id);
            this.players.set(id, cube);
            console.log('Player added, total players:', this.players.size);
        }
    },

    removePlayer(id) {
        console.log('Removing player:', id);
        if (this.players.has(id)) {
            const cube = this.players.get(id);
            sceneManager.scene.remove(cube);
            this.players.delete(id);
            console.log('Player removed, remaining players:', this.players.size);
        }
    },

    updatePlayerPosition(id, x, y) {
        const player = this.players.get(id);
        if (player && id !== this.myPlayerId) {
            player.position.x = x;
            player.position.y = y;
        }
    },

    updateRotations() {
        this.players.forEach(player => {
            player.rotation.x += 0.01;
            player.rotation.y += 0.01;
        });
    },
  
    updatePlayers(){
      this.players.forEach(player => {
        //clamp speed
        player.velocity.x = Math.max(
          -this.MAX_HORIZONTAL_SPEED,
          Math.min(this.MAX_HORIZONTAL_SPEED, player.velocity.x)
        );
        //apply velocity
        player.position.x += player.velocity.x;
        //apply gravity
        if (!player.grounded) {
          player.velocity.y -= this.GRAVITY;
        }
        //apply velocity
        player.position.y += player.velocity.y
        
      });
    },
  
    moveLeft(player){
      player.velocity.x -= this.HORIZONTAL_AIR_ACCELERATION;
    },
    moveRight(player){
      player.velocity.x += this.HORIZONTAL_AIR_ACCELERATION;
    },
    jump(player){
      if(player.grounded){
        player.velocity.y += this.JUMP_FORCE;
        player.grounded = false;
      }
    }
};
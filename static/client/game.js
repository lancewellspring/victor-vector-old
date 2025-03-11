import { sceneManager } from "./scene.js";
//import { PhysicsManager } from "../physicsManager.js"; its global
let PhysicsManager = window.PhysicsManager;
import { playerManager } from "./entities/player.js";
import { inputManager } from "./input.js";
import { networkManager } from "./network.js";
import { worldManager } from "./entities/world.js";
import { BackgroundManager } from "./entities/background.js";

// Game loop
const gameLoop = {
  init() {
    console.log("Initializing game loop");
    sceneManager.init();
    inputManager.init();
    networkManager.init();
    worldManager.init(sceneManager.scene);
    //playerManager.addPlayer(0);
    //playerManager.myPlayerId = 0;
    this.backgroundManager = new BackgroundManager(this.scene);
    this.physicsManager = new PhysicsManager();
    this.physicsManager
      .createPhysicsWorld()
      .then((world) => {        
        this.physicsManager.createGround(worldManager.groundMesh);
        worldManager.platforms.forEach((plat) => {
          this.physicsManager.createConvexBody(plat);
        });
        console.log("Physics world created successfully");
        this.animate();
        console.log("Game loop initialized");
        // Continue with your code
      })
      .catch((err) => {
        console.error("Physics initialization failed:", err);
      });
  },

  update() {
    this.physicsManager.world.step();
    const myPlayer =
      playerManager.myPlayerId !== null &&
      playerManager.players.has(playerManager.myPlayerId)
        ? playerManager.players.get(playerManager.myPlayerId)
        : null;
    //     let pos = this.physicsManager.player.translation();
    //     myPlayer.position.set(pos.x, pos.y, 0);

    //     if(!pos){
    //       myPlayer.position.x = 0;
    //       myPlayer.position.y = worldManager.getGroundHeightAt(0).y;
    //       pos = myPlayer.position;
    //     }
    //     sceneManager.updateCameraPosition(myPlayer.position, pos.y);
    //     this.backgroundManager.update(myPlayer.position.x, myPlayer.position.y);

    // const moved = inputManager.handleInput();
    // playerManager.updateRotations();
    // playerManager.updatePlayers();

    //     if (myPlayer) {
    //       if (inputManager.left) playerManager.moveLeft(myPlayer);
    //       if (inputManager.right) playerManager.moveRight(myPlayer);
    //       if (inputManager.jumped) playerManager.jump(myPlayer);
    //       if (inputManager.rotating) sceneManager.rotateCamera(myPlayer.position);

    //       if(myPlayer.position.x < 0) myPlayer.position.x = 0;

    //       const collisionResult = this.checkCollisions(myPlayer);
    //       let pos = worldManager.getGroundHeightAt(myPlayer.position.x);
    //       if(!pos){
    //         myPlayer.position.x = 0;
    //         myPlayer.position.y = worldManager.getGroundHeightAt(0).y;
    //         pos = myPlayer.position;
    //       }
    //       sceneManager.updateCameraPosition(myPlayer.position, pos.y);
    //       // Update world (camera following, etc)
    //       //worldManager.update(myPlayer.position);
    //       this.backgroundManager.update(myPlayer.position.x, myPlayer.position.y);

    // Only send position if it's changed significantly
    if (myPlayer && myPlayer.controller) {
      inputManager.handleInput(myPlayer);
      sceneManager.updateCameraPosition(myPlayer.playerBody.translation());
      
      if (
        Math.abs(myPlayer.position.x - inputManager.lastSentX) > 1 ||
        Math.abs(myPlayer.position.y - inputManager.lastSentY) > 1
      ) {
        inputManager.lastSentX = myPlayer.position.x;
        inputManager.lastSentY = myPlayer.position.y;
        networkManager.sendPosition(myPlayer.position.x, myPlayer.position.y);
      }
    }
    else if(myPlayer){
      this.physicsManager.createCharacter(myPlayer);
    }
    //}
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    this.update();
    sceneManager.renderer.autoClear = true;
    sceneManager.renderer.render(
      this.backgroundManager.scene,
      this.backgroundManager.camera
    );
    sceneManager.renderer.autoClear = false;
    // Clear only the depth buffer before rendering the main scene
    sceneManager.renderer.clearDepth();
    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
  },

  /**
   * Checks collision with both ground meshes and regular platforms
   * @param {Object} player - Player object with position
   * @returns {boolean} Whether position is valid
   */
  checkCollisions(player) {
    let validPosition = false;
    this.isGrounded = false;

    player.geometry.computeBoundingBox();

    const playerBounds = {
      x: player.position.x,
      y: player.position.y,
      width: 20,
      height: 20,
    };

    worldManager.platforms.forEach((platform) => {
      // Check if this is a ground mesh (has groundPoints) or regular platform
      if (platform.groundPoints) {
        // Ground mesh collision
        const groundHeight = worldManager.getGroundHeightAt(player.position.x);
        if (groundHeight !== null) {
          // Check if player is within x bounds of the ground
          const minX = platform.groundPoints[0].x;
          const maxX =
            platform.groundPoints[platform.groundPoints.length - 1].x;
          player.grounded = false;

          if (player.position.x >= minX && player.position.x <= maxX) {
            // Check if player is at or below ground height
            if (player.position.y - playerBounds.height / 2 <= groundHeight.y) {
              player.position.y = groundHeight.y + playerBounds.height / 2;
              player.position.z = groundHeight.z;
              this.isGrounded = true;
              player.grounded = true;
              validPosition = true;
            }
          }
        }
      } else {
        //             // Regular platform collision
        //             const platformBounds = {
        //                 x: platform.position.x,
        //                 y: platform.position.y,
        //                 width: platform.geometry.parameters.width,
        //                 height: platform.geometry.parameters.height
        //             };

        //             if (this.checkOverlap(playerBounds, platformBounds)) {
        //                 this.resolveCollision(player, playerBounds, platformBounds);
        //                 validPosition = true;
        //             }
        const rockBoundingSphere = platform.geometry.boundingSphere.clone();
        rockBoundingSphere.center.copy(platform.position);
        const playerBox = new THREE.Box3().setFromObject(player);
        if (rockBoundingSphere.intersectsBox(playerBox)) {
          //player.position.y = platform.position.y + platform.geometry.boundingBox.getSize().y;
          validPosition = true;
          this.handleRockCollision(player, rockBoundingSphere);
          player.grounded = true;
          this.isGrounded = true;
        }
      }
    });

    return validPosition;
  },
  /**
   * Handles collision response between player and rock
   * @param {Object} player - The player object with position and velocity
   * @param {Object} rock - The rock object with position and boundingSphere
   * @param {Number} elasticity - Bounce factor (0 = stop, 1 = perfect bounce)
   * @param {Number} friction - Friction factor for sliding (0 = no friction, 1 = maximum)
   */
  handleRockCollision(player, rock, elasticity = 0.1, friction = 0.2) {
    // Calculate collision normal (direction from rock center to player)
    const collisionNormal = player.position
      .clone()
      .sub(rock.center)
      .normalize();

    // Calculate penetration depth
    const playerRadius =
      player.geometry.boundingBox.getSize(new THREE.Vector3()).length() / 2;
    const penetrationDepth =
      rock.radius + playerRadius - player.position.distanceTo(rock.center);

    // Only respond if actually penetrating
    if (penetrationDepth <= 0) return;

    // Check if player is on top of the rock (y component dominant)
    const isOnTop = collisionNormal.y > 0.7; // If normal points mostly upward

    // Set grounded flag if standing on top
    if (isOnTop && player.velocity.y <= 0) {
      player.grounded = true;
      player.velocity.y = 0;
    }

    // Modified collision normal for top surface
    let effectiveNormal;
    if (isOnTop) {
      // Use pure upward normal when on top to create flat surface effect
      effectiveNormal = new THREE.Vector3(0, 1, 0);
    } else {
      effectiveNormal = collisionNormal;
    }

    // Move player out of collision
    const correction = effectiveNormal.clone().multiplyScalar(penetrationDepth);
    player.position.add(correction);

    // Anti-jitter measures for standing on top
    if (isOnTop) {
      // If player is mostly stationary on top
      const horizontalVelocitySq =
        player.velocity.x * player.velocity.x +
        player.velocity.z * player.velocity.z;

      // If player is not actively moving horizontally and falling/standing
      if (horizontalVelocitySq < 0.01 && player.velocity.y <= 0.1) {
        // Very low elasticity for tiny bounces
        elasticity = 0;

        // If very small vertical velocity, zero it out completely
        if (Math.abs(player.velocity.y) < 0.05) {
          player.velocity.y = 0;
        }

        // Slightly increase effective friction when standing
        friction = Math.min(1.0, friction + 0.1);
      }
    }

    // Calculate velocity reflection for bounce effect
    const velocityAlongNormal = player.velocity.dot(effectiveNormal);

    // Only apply bounce if player is moving into the rock
    if (velocityAlongNormal < 0) {
      // Calculate bounce and friction
      const bounce = effectiveNormal
        .clone()
        .multiplyScalar(velocityAlongNormal * (1 + elasticity));
      player.velocity.sub(bounce);

      // Calculate tangential component for friction
      const tangent = player.velocity
        .clone()
        .sub(
          effectiveNormal
            .clone()
            .multiplyScalar(player.velocity.dot(effectiveNormal))
        );

      // Apply friction to tangential component
      if (tangent.lengthSq() > 0.0001) {
        tangent.normalize().multiplyScalar(Math.max(0, 1 - friction));
        // Remove original tangential component and add reduced one
        const tangentialVelocity = player.velocity
          .clone()
          .projectOnVector(tangent);
        player.velocity
          .sub(tangentialVelocity)
          .add(tangentialVelocity.clone().multiplyScalar(1 - friction));
      }
    }

    // Ensure player never has z velocity (2D platformer constraint)
    player.velocity.z = 0;
  },
};

// Start the game
window.addEventListener("load", () => {
  console.log("Window loaded, starting game");
  gameLoop.init();
});


import { networkManager } from "./network.js";

export const inputManager = {
  keys: {},
  lastSentX: 0,
  lastSentY: 0,
  hasFocus: true,

  init() {
    // Key events
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Focus events
    window.addEventListener("blur", () => this.handleBlur());
    window.addEventListener("focus", () => this.handleFocus());

    // Visibility events
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.handleBlur();
      } else {
        this.handleFocus();
      }
    });

    this.MOVE_IMPULSE = 1;
    this.JUMP_IMPULSE = 1;
  },

  handleKeyDown(e) {
    if (!this.hasFocus) return;
    this.keys[e.key] = true;

    // Store jump press timing
    if (event.key === "ArrowUp" || event.key === "w") {
      this.lastJumpPressTime = Date.now();
    }
  },

  handleKeyUp(e) {
    delete this.keys[e.key];
  },

  handleBlur() {
    this.hasFocus = false;
    this.keys = {}; // Clear all key states
    // Stop any ongoing movement animations
    // if (playerManager.myPlayerId) {
    //   const myPlayer = playerManager.players.get(playerManager.myPlayerId);
    //   if (myPlayer) {
    //     // Send one final position update to ensure server state is correct
    //     networkManager.sendPosition(myPlayer.position.x, myPlayer.position.y);
    //   }
    // }
  },

  handleFocus() {
    this.hasFocus = true;
  },

  handleInput(mesh) {
    if (
      !this.hasFocus //||
      //!playerManager.myPlayerId ||
      //!playerManager.players.has(playerManager.myPlayerId)
    ) {
      return false;
    }
    this.rotating = false;

    // Store original position for collision resolution
    const now = Date.now();

    let moveDirection = 0;
    //sceneManager.rotating = false;
    if (this.keys["q"]) {
      this.rotating = true;
      //sceneManager.rotateCamera(myPlayer.position);
    }

    // Apply horizontal acceleration based on input
    if (this.keys["ArrowLeft"] || this.keys["a"]) {
      moveDirection -= 1;
      console.log("Moving left, new velocity:", this.horizontalVelocity);
    }
    if (this.keys["ArrowRight"] || this.keys["d"]) {
      moveDirection += 1;
      console.log("Moving right, new velocity:", this.horizontalVelocity);
    }
    
      // Get player body from the game's physics manager
    const playerBody = mesh.playerBody;
    const playerCollider = mesh.playerCollider;
    
    if (!playerBody || !playerCollider) {
      console.error("Player physics body or collider not found");
      return;
    }
    
    // Apply horizontal force based on movement direction
    if (moveDirection !== 0) {
        // Create a desired translation vector
      const desiredTranslation = { 
        x: moveDirection * this.MOVE_IMPULSE, 
        y: 0 
      };

      // Use the character controller to compute movement with collision detection
      mesh.controller.computeColliderMovement(
        playerCollider,
        desiredTranslation
      );

      // Get the corrected movement
      const computedMovement = mesh.controller.computedMovement();

      // Apply the movement to the rigid body
      const currentPos = playerBody.translation();
      playerBody.setNextKinematicTranslation({
        x: currentPos.x + computedMovement.x,
        y: currentPos.y + computedMovement.y
      });
      
      mesh.position.set(playerBody.translation());

      // Update facing direction
      mesh.facing = moveDirection > 0 ? 'right' : 'left';
    }
    
    // Jump handling
    if ((this.keys["ArrowUp"] || this.keys["w"]) && mesh.isGrounded) {
      // For jumping, we apply an upward translation
      const jumpTranslation = { x: 0, y: this.JUMP_IMPULSE };

      // Apply the jump directly to the rigid body
      const currentPos = playerBody.translation();
      playerBody.setTranslation({
        x: currentPos.x,
        y: currentPos.y + jumpTranslation.y
      });

      mesh.grounded = false;
      mesh.jumping = true;
    }

  },

  

//   checkOverlap(bounds1, bounds2) {
//     return !(
//       bounds1.x + bounds1.width < bounds2.x ||
//       bounds1.x > bounds2.x + bounds2.width ||
//       bounds1.y + bounds1.height < bounds2.y ||
//       bounds1.y > bounds2.y + bounds2.height
//     );
//   },

//   resolveCollision(player, playerBounds, platformBounds) {
//     // Calculate overlap
//     const overlapX = Math.min(
//       Math.abs(
//         playerBounds.x +
//           playerBounds.width / 2 -
//           (platformBounds.x - platformBounds.width / 2)
//       ),
//       Math.abs(
//         playerBounds.x -
//           playerBounds.width / 2 -
//           (platformBounds.x + platformBounds.width / 2)
//       )
//     );

//     const overlapY = Math.min(
//       Math.abs(
//         playerBounds.y +
//           playerBounds.height / 2 -
//           (platformBounds.y - platformBounds.height / 2)
//       ),
//       Math.abs(
//         playerBounds.y -
//           playerBounds.height / 2 -
//           (platformBounds.y + platformBounds.height / 2)
//       )
//     );

//     // Resolve collision (prioritize Y-axis for platforming feel)
//     if (overlapY < overlapX) {
//       if (playerBounds.y > platformBounds.y) {
//         // Landing on top of platform
//         player.position.y =
//           platformBounds.y + platformBounds.height + playerBounds.height / 2;
//         this.jumpVelocity = 0;
//         this.isGrounded = true;
//       } else {
//         // Hitting bottom of platform
//         player.position.y =
//           platformBounds.y - platformBounds.height - playerBounds.height / 2;
//         this.jumpVelocity = 0;
//       }
//     } else {
//       // Side collision
//       if (playerBounds.x < platformBounds.x) {
//         player.position.x =
//           platformBounds.x - platformBounds.width / 2 - playerBounds.width / 2;
//       } else {
//         player.position.x =
//           platformBounds.x + platformBounds.width / 2 + playerBounds.width / 2;
//       }
//     }
//   },
};

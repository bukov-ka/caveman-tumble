import { TARGET_LABEL } from "./target.js";

export class PhysicManager {
  constructor(parent) {
    this.parent = parent;

    this.engine = Matter.Engine.create();
    this.runner = Matter.Runner.create();
    this.engine.world.gravity.y = 0.1;

    Matter.Events.on(
      this.engine,
      "collisionStart",
      this.collisionStart.bind(this)
    );
    Matter.Events.on(this.engine, "afterUpdate", this.afterUpdate.bind(this));
  }

  collisionStart(event) {
    if (this.parent.gameWonState) {
      return;
    }

    let pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      let pair = pairs[i];
      let targetBody = null;
      let stoneBody = null;

      if (pair.bodyA.label === TARGET_LABEL) {
        targetBody = pair.bodyA;
        stoneBody = pair.bodyB;
      } else if (pair.bodyB.label === TARGET_LABEL) {
        targetBody = pair.bodyB;
        stoneBody = pair.bodyA;
      }

      if (targetBody) {
        this.parent.levelManager.target.makeFall();
        this.parent.gameWon();
        // set a timer for 2 seconds
        setTimeout(() => {
          // Displaying the SweetAlert popup
          Swal.fire({
            title: "Congratulations!",
            html: `You won!<br><img src='img/grumpy_small.png'><br><br>Stone mass: ${(
              stoneBody.mass / 1000
            ).toFixed(2)}`,
            icon: "success",
            customClass: "swal-wide", // Set width to 25% of screen width
          });
        }, 2000);
      }
    }
  }

  afterUpdate() {
    if (this.parent.currentMode !== "simulation" || this.parent.hasWon()) {
      return;
    }

    const condition = this.parent.levelManager.allStonesSleeping();
    if (condition) {
      this.parent.gameLost();
    }
  }

  run() {
    Matter.Runner.run(this.runner, this.engine);
  }
}

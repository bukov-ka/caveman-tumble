export const TARGET_LABEL = "target";
export const SAFE_DISTANCE = 200;

export class Target {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.safeDistance = SAFE_DISTANCE;
    this.body = Matter.Bodies.rectangle(x, y, 32, 32, {
      isStatic: true,
      isSensor: true,
      mass: 0.001,
      render: {
        // fillStyle: "transparent" ,
        sprite: {
          texture: "img/caveman_small.png",
          xScale: 1,
          yScale: 1,
        },
      },
      chamfer: { radius: 10 },
    });
    this.body.label = TARGET_LABEL;
  }

  makeFall() {
    // Make the body non-static so it can fall
    Matter.Body.setStatic(this.body, false);

    // Apply a force to the body to make it fall
    //  Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -100000 });

    // Rotate the body as it falls
    Matter.Body.rotate(this.body, Math.PI / 4);
    Matter.Body.setAngularVelocity(this.body, 0.05);
  }

  reset() {
    Matter.Body.setStatic(this.body, true);
    Matter.Body.setPosition(this.body, { x: this.x, y: this.y});
    Matter.Body.setAngle(this.body, 0);
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.body, 0);
  }
}

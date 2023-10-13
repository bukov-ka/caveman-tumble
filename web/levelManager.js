import { Target } from "./target.js";
import { GravityApi } from "./gravityApi.js";

const MAX_FALLING_COORDINATE =
  document.getElementById("gameCanvas").offsetHeight *
  window.devicePixelRatio *
  2;

export class LevelManager {
  constructor(parent, engine, resetFlag = false) {
    this.parent = parent;
    this.engine = engine;
    this.resetFlag = resetFlag;
    this.groundPolygons = [];
    this.stones = [];
    this.target = null;
    this.solution = {
      stones: [],
      ground: [],
    };
  }

  addGround(ground) {
    ground.userAdded = !this.loadFlag;
    this.groundPolygons.push(ground);
    Matter.World.add(this.engine.world, ground.body);
  }

  addStone(stone) {
    stone.userAdded = !this.loadFlag;
    this.stones.push(stone);
    Matter.World.add(this.engine.world, stone.body);
  }

  allStonesSleeping() {
    return this.stones.every(
      (stone) =>
        stone.body.isSleeping ||
        stone.body.position.y > MAX_FALLING_COORDINATE ||
        stone.body.speed < 0.1
    ); // Either sleeping (or too low speed) or falling too far down
  }

  loadTarget(x, y) {
    // If a target already exists, remove it from the world
    if (this.target) {
      Matter.World.remove(this.engine.world, this.target.body);
    }

    // Create a new target and add it to the world
    this.target = new Target(x, y);
    Matter.World.add(this.engine.world, this.target.body);
  }

  async saveLevelState() {
    // Set userAdded=false for all ground and stone polygons
    this.groundPolygons.forEach((ground) => (ground.userAdded = false));
    this.stones.forEach((stone) => (stone.userAdded = false));

    // Construct the level state
    let levelState = {
      target: {
        x: this.target.body.position.x,
        y: this.target.body.position.y,
      },
      stones: this.stones.map((stone) => stone.points),
      ground: this.groundPolygons.map((ground) => ground.points),
      message: document.getElementById("message").value,
    };

    // Convert the level state to a JSON string
    let levelStateJson = JSON.stringify(levelState, null, 2);

    // Get the password from the input field
    const password = document.getElementById("password").value;

    try {
      await GravityApi.createOrUpdateItem(
        this.levelId,
        levelStateJson,
        password
      );
      Swal.fire({
        title: "Success!",
        html: `Level saved successfully`,
        icon: "success",
      });
    } catch (error) {
      Swal.fire({
        title: "Error!",
        html: `Error saving level.<br>Check the password.`,
        icon: "error",
      });
      console.error("Error saving level: ", error);
    }
  }

  async loadLevelState(levelId) {
    this.levelId = levelId;
    this.loadFlag = true;
    try {
      const levelState = await GravityApi.getItem(levelId);
      const { target, ground, stones, message } = levelState;
      if (message) {
        Swal.fire({
          title: "<img src='img/head_small.png'>",
          html: `${message}`,
        });
      }

      this.loadTarget(target.x, target.y);
      this.loadGround(ground);
      this.loadStones(stones);
    } catch (error) {
      console.error(
        "There was a problem with loading a level: " + error.message
      );
    }
    this.loadFlag = false;
  }

  loadGround(ground) {
    this.parent.currentMode = "ground";
    for (let i = 0; i < ground.length; i++) {
      const groundPolygonVertices = ground[i].map((vertex) => {
        return { x: vertex.x, y: vertex.y };
      });

      // Check if the polygon was added by user or not in reset mode
      const polygon = this.groundPolygons.find(
        (polygon) => polygon.points === groundPolygonVertices
      );
      if (!this.resetFlag || (this.resetFlag && polygon && polygon.userAdded)) {
        this.parent.addPolygon(groundPolygonVertices);
      }
    }
  }

  loadStones(stones) {
    this.parent.currentMode = "stones";
    for (let i = 0; i < stones.length; i++) {
      const stoneVertices = stones[i].map((vertex) => {
        return { x: vertex.x, y: vertex.y };
      });

      // Check if the polygon was added by user or not in reset mode
      const stone = this.stones.find((stone) => stone.points === stoneVertices);
      if (!this.resetFlag || (this.resetFlag && stone && stone.userAdded)) {
        this.parent.addPolygon(stoneVertices);
      }
    }
  }

  async saveSolutionState() {
    const filteredStones = this.stones.filter((stone) => stone.userAdded);
    const filteredGround = this.groundPolygons.filter(
      (ground) => ground.userAdded
    );

    const solutionState = {
      stones: filteredStones.map((stone) => stone.points),
      ground: filteredGround.map((ground) => ground.points),
    };

    const solutionStateJson = JSON.stringify(solutionState, null, 2);
    const password = document.getElementById("password").value;

    try {
      await GravityApi.createOrUpdateItem(
        `${this.levelId}_solution`,
        solutionStateJson,
        password
      );
      Swal.fire({
        title: "Success!",
        html: `Solution saved successfully`,
        icon: "success",
      });
      console.log(`Solution saved successfully id:${this.levelId}_solution`);
    } catch (error) {
      Swal.fire({
        title: "Error!",
        html: `Error saving solution.<br>Check the password.`,
        icon: "error",
      });
      console.error("Error saving solution: ", error);
    }
  }

  async loadSolutionState() {
    try {
      const solutionState = await GravityApi.getItem(
        this.levelId + "_solution"
      );

      if (!solutionState) {
        console.error("No solution found");
        return;
      }
      // First, remove all user-added polygons from both the array and MatterJS world
      this.groundPolygons = this.groundPolygons.filter((polygon) => {
        if (polygon.userAdded) {
          Matter.World.remove(this.engine.world, polygon.body);
          return false;
        }
        return true;
      });

      // Do the same for stones
      this.stones = this.stones.filter((stone) => {
        if (stone.userAdded) {
          Matter.World.remove(this.engine.world, stone.body);
          return false;
        }
        return true;
      });

      // Then load the solution
      this.loadGround(solutionState.ground);
      this.loadStones(solutionState.stones);
    } catch (error) {
      Swal.fire({
        title: "Error!",
        html: `No solution found.`,
        icon: "error",
      });
      console.error(
        "There was a problem with loading the solution: " + error.message
      );
    }
  }

  remove(polygonToRemove) {
    Matter.World.remove(this.engine.world, polygonToRemove.body);

    if (this.stones.includes(polygonToRemove)) {
      const idx = this.stones.indexOf(polygonToRemove);
      this.stones.splice(idx, 1);
    } else if (this.groundPolygons.includes(polygonToRemove)) {
      const idx = this.groundPolygons.indexOf(polygonToRemove);
      this.groundPolygons.splice(idx, 1);
    }
  }
}

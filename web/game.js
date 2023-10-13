import { Polygon } from "./polygon.js";
import { LevelManager } from "./levelManager.js";
import { PhysicManager } from "./physicManager.js";
import { UIManager } from "./uiManager.js";

export class Game {
  constructor(canvas, readyButton, saveButton, gameStatus, radioButtonGroup) {
    this.gameWonState = false;
    this.gameLostState = false;
    this.currentMode = radioButtonGroup.value;
    this.adminMode = false;
    this.canvas = canvas;
    this.readyButton = readyButton;
    this.gameStatus = gameStatus;
    this.radioButtonGroup = radioButtonGroup;

    this.passInput = document.getElementById("password");

    this.urlParams = new URLSearchParams(window.location.search);
    // Get the admin parameter from the URL
    this.isAdmin = this.urlParams.get("admin") === "true";

    this.physicManager = new PhysicManager(this);

    this.render = Matter.Render.create({
      canvas: canvas,
      engine: this.physicManager.engine,
      options: {
        width: 1600,
        height: 600,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio,
      },
    });

    this.uiManager = new UIManager(
      canvas,
      readyButton,
      gameStatus,
      radioButtonGroup,
      this
    );
    this.levelManager = new LevelManager(this, this.physicManager.engine);

    saveButton.addEventListener("click", () => {
      this.levelManager.saveLevelState();
    });

    const saveSolutionButton = document.getElementById("saveSolutionButton"); // TODO: pass the buttons
    const loadSolutionButton = document.getElementById("loadSolutionButton");

    saveSolutionButton.addEventListener("click", () => {
      this.levelManager.saveSolutionState();
    });

    loadSolutionButton.addEventListener("click", () => {
      Swal.fire({
        title: "Do you really want to see the solution?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
      }).then((result) => {
        if (result.isConfirmed) {
          this.levelManager.loadSolutionState();
        }
      });
    });

    this.render.engine.world.gravity.y = 1;
    this.render.engine.world.gravity.scale = 0.0002; // Make everything slower

    this.init();
  }

  init() {
    this.levelManager.loadTarget(
      this.render.options.width / 2 + 150,
      (this.render.options.height * 2) / 3
    );
    Matter.Render.run(this.render);
    requestAnimationFrame(this.draw.bind(this));

    // Get the level parameter from the URL
    const level = this.urlParams.get("level");

    // Use the level parameter to load the corresponding level
    let levelId = level ? `${level}` : "1.json";

    // Check if level parameter was provided
    if (!level && this.isAdmin) {
      // Generate new UUID
      this.levelId = uuid.v4();

      // Build new URL with levelId parameter
      const newURL = new URL(window.location.href);
      newURL.searchParams.set("level", this.levelId);

      // Replace the current URL in the browser's history,
      // without causing the browser to refresh the page.
      window.history.replaceState({}, "", newURL);

      // Prompt for password
      const password = window.prompt("Please enter level password");
      if (!password) {
        alert("Password is required!");
        return;
      } else {
        this.passInput.value = password;
      }

      levelId = this.levelId;
    }

    if (this.isAdmin) {
      // Remove 'admin=true' from the share link
      const newShareURL = new URL(window.location.href);
      newShareURL.searchParams.delete("admin");

      // Make the shareLinkButton visible
      const shareLinkButton = document.getElementById("shareLinkButton");
      shareLinkButton.style.display = "block";

      // Setup 'copy to clipboard' functionality
      shareLinkButton.addEventListener("click", () => {
        navigator.clipboard
          .writeText(newShareURL.toString())
          .then(() => alert("Share link copied to clipboard"))
          .catch((error) => console.error("Could not copy text: ", error));
      });
    }

    this.levelManager.loadLevelState(levelId);
  }

  addPolygon(poly) {    
    let polygon = null;
    if (this.currentMode === "simulation") {
      // Simulation has already started
      return;
    }    

    if (this.currentMode === "ground") {
      const color = this.uiManager.getGroundColor();
      polygon = new Polygon(poly, true, color, this); // Ground is static
      if (polygon && polygon.body && polygon.isValidPolygon()) {
        this.levelManager.addGround(polygon);
      }
    } else if (this.currentMode === "stones") {
      const color = this.uiManager.getStoneColor();
      polygon = new Polygon(poly, false, color, this); // Stones are not static
      if (polygon && polygon.body && polygon.isValidPolygon()) {
        this.levelManager.addStone(polygon);
      }
    } else {
      // this.currentMode === 'target'
      this.levelManager.loadTarget(this.mousePosition.x, this.mousePosition.y);
    }

    if (!polygon || !polygon.body || !polygon.isValidPolygon()) {
      this.uiManager.showWarningMessage("Incorrect polygon");
    }
  }

  startSimulation() {
    // // Bring the target to the front
    // Matter.World.remove(this.render.engine.world, this.levelManager.target.body);
    // Matter.World.add(this.render.engine.world, this.levelManager.target.body);

    for (let i = 0; i < this.levelManager.stones.length; i++) {
      let stone = this.levelManager.stones[i];
      Matter.Body.setStatic(stone.body, false);
    }
    this.physicManager.run();
  }

  gameWon() {
    this.gameWonState = true;
    this.uiManager.gameStatus.textContent = "Game won!";
    // Notify that the current level has been completed
    if (window.parent.markLevelAsCompleted) {
      window.parent.markLevelAsCompleted(this.levelManager.levelId);
    }
  }

  gameLost() {
    this.gameLostState = true;
    this.uiManager.gameStatus.textContent = "Game lost!";
  }

  hasWon() {
    return this.gameWonState;
  }

  draw() {
    Matter.Render.world(this.render);
    this.uiManager.drawCurrentPolygon();

    if (
      this.currentMode !== "simulation" &&
      this.uiManager.highlightedPolygon &&
      // No current polygon drawn
      this.uiManager.currentPolygon.length === 0
    ) {
      this.uiManager.highlightPolygon(this.uiManager.highlightedPolygon.points);
    }

    requestAnimationFrame(this.draw.bind(this));
  }

  reset() {
    // Stop the simulation
    Matter.Runner.stop(this.physicManager.runner);

    // Clear the world
    Matter.World.clear(this.physicManager.engine.world);

    // Add back original ground polygons and stones
    this.levelManager.groundPolygons.forEach((polygon) => {
      Matter.World.add(this.physicManager.engine.world, polygon.body);

      this.uiManager.reset();
    });

    // Add back target
    Matter.World.add(
      this.physicManager.engine.world,
      this.levelManager.target.body
    );
    this.levelManager.target.reset();

    this.levelManager.stones.forEach((stone) => {
      // stone.createBody();
      // Matter.World.add(this.physicManager.engine.world, stone.body);
      // Restore position, orientation and velocity, because stone is not static
      Matter.Body.setPosition(stone.body, stone.initialPosition);
      Matter.Body.setAngle(stone.body, 0);
      Matter.Body.setVelocity(stone.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(stone.body, 0);
      Matter.World.add(this.physicManager.engine.world, stone.body);
    });

    // Add back the original target
    Matter.World.add(
      this.physicManager.engine.world,
      this.levelManager.target.body
    );

    // Reset the game state
    this.gameWonState = false;
    this.gameLostState = false;
  }
}

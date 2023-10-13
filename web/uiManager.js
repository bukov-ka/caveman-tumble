import { Polygon } from "./polygon.js";

export class UIManager {
  static WARNING_DISPLAY_DURATION = 5000;

  constructor(canvas, readyButton, gameStatus, radioButtonGroup, parent) {
    this.parent = parent;

    this.radioButtonGroup = radioButtonGroup;
    this.canvas = canvas;
    this.readyButton = readyButton;
    this.gameStatus = gameStatus;
    this.ctx = this.canvas.getContext("2d");

    this.isDrawing = false;
    this.currentPolygon = [];
    this.highlightedPolygon = null;
    this.mousePosition = { x: 0, y: 0 };

    this.init();
  }

  init() {
    this.readyButton.addEventListener("click", this.handleReady.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener(
      "contextmenu",
      this.handleRightClick.bind(this)
    );
    window.addEventListener("keydown", this.handleKeyDown.bind(this));

    this.getCurrentMode();

    // Disable admin controls for non-admin users
    if (!this.parent.isAdmin) {
      const adminElements = document.querySelectorAll("[admin]");
      adminElements.forEach((element) => {
        element.style.display = "none";
      });
    }

    this.readyButton = document.getElementById("readyButton");
    this.resetButton = document.getElementById("resetButton");
  }

  getCurrentMode() {
    this.parent.currentMode = Array.from(this.radioButtonGroup).find(
      (rb) => rb.checked
    ).value;
    this.radioButtonGroup.forEach((rb) => {
      rb.addEventListener("change", (event) => {
        if (event.target.checked) {
          this.parent.currentMode = event.target.value;
        }
      });
    });
  }

  handleReady() {
    this.parent.currentMode = "simulation";
    // Disable all radio buttons if Simulation is selected
    this.radioButtonGroup.forEach((rb) => (rb.disabled = true));
    // Show resetButton and hide readyButton
    this.resetButton.style.display = "inline-block";
    this.readyButton.style.display = "none";
    this.parent.startSimulation();
  }

  reset() {
    this.getCurrentMode();
    // Enable bakc all radio buttons
    this.radioButtonGroup.forEach((rb) => (rb.disabled = false));
    this.gameStatus.textContent = ""; // Reset game status
    this.resetButton.style.display = "none";
    this.readyButton.style.display = "inline-block";
  }

  handleMouseMove(event) {
    this.updateMousePosition(event);

    const allUserAddedPolygons = [
      ...this.parent.levelManager.groundPolygons.filter(
        (poly) => poly.userAdded || this.parent.isAdmin
      ),
      ...this.parent.levelManager.stones.filter(
        (stone) => stone.userAdded || this.parent.isAdmin
      ),
    ];

    const hoveredPolygon = this.getClickedPolygon(allUserAddedPolygons);

    this.updateHighlightedPolygon(hoveredPolygon);
  }

  updateMousePosition(event) {
    const rect = event.target.getBoundingClientRect();
    const scaleX = event.target.width / (rect.width * window.devicePixelRatio);
    const scaleY =
      event.target.height / (rect.height * window.devicePixelRatio);

    this.mousePosition = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  updateHighlightedPolygon(hoveredPolygon) {
    if (this.highlightedPolygon && !hoveredPolygon) {
      this.clearHighlightedPolygon();
    } else if (
      this.highlightedPolygon &&
      hoveredPolygon &&
      this.highlightedPolygon !== hoveredPolygon
    ) {
      this.clearHighlightedPolygon();
      this.highlightedPolygon = hoveredPolygon;
      hoveredPolygon.highlight();
    } else if (!this.highlightedPolygon && hoveredPolygon) {
      this.highlightedPolygon = hoveredPolygon;
      hoveredPolygon.highlight();
    }
  }

  clearHighlightedPolygon() {
    this.highlightedPolygon.removeHighlight();
    this.highlightedPolygon = null;
  }

  handleMouseDown(event) {}

  handleMouseUp(event) {
    const mousePosition = this.mousePosition;

    if (event.button === 0 && !this.isDrawing) {
      const clickedPolygon =
        this.getClickedPolygon(this.parent.levelManager.groundPolygons) ||
        this.getClickedPolygon(this.parent.levelManager.stones);

      if (clickedPolygon && (clickedPolygon.userAdded || this.parent.isAdmin)) {
        this.parent.levelManager.remove(clickedPolygon);
        return;
      }

      if (event.button === 0) {
        this.isDrawing = true;
      }
    }

    if (
      !this.parent.isAdmin &&
      this.parent.currentMode === "stones" &&
      !this.handleSafeDistanceCheck(mousePosition)
    ) {
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      this.handleRightClickDrawing(mousePosition);
    }

    if (event.button === 0) {
      this.handleLeftClickDrawing(mousePosition);
    }
  }

  handleSafeDistanceCheck(mousePosition) {
    const safeDistance = this.parent.levelManager.target.safeDistance;
    const targetPosition = this.parent.levelManager.target.body.position;
    const distanceToTarget = Math.hypot(
      mousePosition.x - targetPosition.x,
      mousePosition.y - targetPosition.y
    );

    if (
      distanceToTarget < safeDistance &&
      this.parent.currentMode === "stones"
    ) {
      this.showSafeDistanceWarning("You are clicking too close to the caveman");
      return false;
    }
    return true;
  }

  showSafeDistanceWarning(message) {
    this.showWarningMessage(message);
  }

  showWarningMessage(message) {
    this.gameStatus.textContent = message;
    setTimeout(() => {
      this.gameStatus.textContent = "";
    }, UIManager.WARNING_DISPLAY_DURATION);
  }

  isAnySideTooCloseToTarget(points) {
    for (let i = 0; i < points.length; i++) {
      const point1 = points[i];
      const point2 = points[i === points.length - 1 ? 0 : i + 1];

      if (
        this.isSideTooCloseToTarget(
          point1,
          point2,
          this.parent.levelManager.target.body.position
        )
      ) {
        return true;
      }
    }
    return false;
  }

  handleRightClickDrawing(mousePosition) {
    this.isDrawing = false;
    if (!this.parent.isAdmin) {
      const enclosedPolygon = [...this.currentPolygon, this.currentPolygon[0]];

      if (this.parent.currentMode === "stones") {
        if (this.isAnySideTooCloseToTarget(enclosedPolygon)) {
          this.showSafeDistanceWarning("The stone is too close to the caveman");
          this.currentPolygon = [];
          return;
        }

        const tempPolygon = new Polygon(enclosedPolygon);

        if (
          tempPolygon.insidePolygon(
            this.parent.levelManager.target.body.position
          )
        ) {
          this.showSafeDistanceWarning(
            "The caveman cannot be put inside a stone."
          );
          this.currentPolygon = [];
          return;
        }
      }
    }

    this.parent.addPolygon(this.currentPolygon);
    this.currentPolygon = [];
  }

  handleLeftClickDrawing(mousePosition) {
    if (this.parent.currentMode === "target") {
      this.parent.levelManager.loadTarget(
        mousePosition.x,
        mousePosition.y - 40
      );
    } else {
      this.isDrawing = true;

      if (!this.currentPolygon.length) {
        this.currentPolygon.push(mousePosition);
      } else {
        const lastPoint = this.currentPolygon[this.currentPolygon.length - 1];
        if (
          !(lastPoint.x === mousePosition.x && lastPoint.y === mousePosition.y)
        ) {
          this.currentPolygon.push(mousePosition);
        }
      }
    }
  }

  getClickedPolygon(polygons) {
    return polygons.find((polygon) => {
      return polygon.insidePolygon(this.mousePosition);
    });
  }

  handleRightClick(event) {
    event.preventDefault();
    if (this.isDrawing) {
      this.isDrawing = false;
    }
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      this.isDrawing = false;
      this.currentPolygon = [];
    }
    if (event.key === 'z' || event.key === 'Z') {
      if (this.currentPolygon.length > 0) {
        this.currentPolygon.pop();
      }
    }
  }

  drawCurrentPolygon() {
    this.drawPolygon(this.currentPolygon);
    this.drawUpperEdges();
  }

  drawPolygon(positions) {
    this.ctx.beginPath();
    positions.forEach((pos, index) => {
      if (index === 0) this.ctx.moveTo(pos.x, pos.y);
      else this.ctx.lineTo(pos.x, pos.y);

      // Save the context state
      this.ctx.save();

      // Draw circle at the point's position
      this.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2, true);

      // Restore the context to the state before drawing the circle
      this.ctx.restore();

      // Return to the center of the circle
      this.ctx.moveTo(pos.x, pos.y);
    });
    this.ctx.closePath();
    this.ctx.stroke();
  }

  highlightPolygon(positions) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = "yellow";
    this.ctx.lineWidth = 2;
    positions.forEach((pos, index) => {
      if (index === 0) this.ctx.moveTo(pos.x, pos.y);
      else this.ctx.lineTo(pos.x, pos.y);
    });
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 1;
  }

  drawUpperEdges() {
    const polygons = this.parent.levelManager.groundPolygons;

    polygons.forEach((poly) => {
      const upperEdges = poly.upperEdges();

      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = "green";

      upperEdges.forEach((edge) => {
        // Draw the line between the two points
        this.ctx.beginPath();
        this.ctx.moveTo(edge.edgeStart.x, edge.edgeStart.y);
        this.ctx.lineTo(edge.edgeEnd.x, edge.edgeEnd.y);
        this.ctx.stroke();
      });

      // Restore the line width and color
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = "black";
    });
  }

  // Generate random brightness of steel blue
  getStoneColor() {
    let baseRed = 70;
    let baseGreen = 130;
    let baseBlue = 180;

    // Generate a random ratio between 0.5 (inclusive) and 1 (exclusive)
    let randomRatio = Math.random() * 0.5 + 0.5;

    let r = Math.floor(baseRed * randomRatio);
    let g = Math.floor(baseGreen * randomRatio);
    let b = Math.floor(baseBlue * randomRatio);

    return `rgb(${r},${g},${b})`;
  }

  getGroundColor() {
    return "rgb(101, 67, 33)";
  }

  isSideTooCloseToTarget(point1, point2, target) {
    const safeDistance = this.parent.levelManager.target.safeDistance;
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const lengthSquared = dx * dx + dy * dy;

    // Calculate the dot product of (target - point1) and (point2 - point1)
    const dotProduct =
      ((target.x - point1.x) * dx + (target.y - point1.y) * dy) / lengthSquared;

    let closestX, closestY;

    if (dotProduct < 0) {
      closestX = point1.x;
      closestY = point1.y;
    } else if (dotProduct > 1) {
      closestX = point2.x;
      closestY = point2.y;
    } else {
      closestX = point1.x + dotProduct * dx;
      closestY = point1.y + dotProduct * dy;
    }

    // Calculate the distance from the target to the closest point on the line segment
    const distance = Math.hypot(target.x - closestX, target.y - closestY);
    return distance < safeDistance;
  }
}

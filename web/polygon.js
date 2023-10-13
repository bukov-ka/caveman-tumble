export class Polygon {
  createBody() {
    this.body = Matter.Bodies.fromVertices(
      this.minX,
      this.minY,
      this.points,
      this.bodyOptions,
      true,
      false,
      0.01
    );

    if (this.body) {
      const minBodyX = Math.min(...this.body.vertices.map((v) => v.x));
      const minBodyY = Math.min(...this.body.vertices.map((v) => v.y));

      Matter.Body.setPosition(this.body, {
        x: this.body.position.x + (this.minX - minBodyX),
        y: this.body.position.y + (this.minY - minBodyY),
      });
      this.initialPosition = {
        x: this.body.position.x,
        y: this.body.position.y,
      };
    }
  }

  constructor(points, isStatic, color, parent) {
    this.angleThreshold = 10;
    this.smoothingDistance = 3;
    this.originalColor = color;
    this.parent = parent;
    points = this.smoothPoints(points);
    this.points = points;
    this.userAdded = false;

    //  Get the boundaries to restore the body position
    this.minX = Math.min(...points.map((p) => p.x));
    this.minY = Math.min(...points.map((p) => p.y));

    this.bodyOptions = {
      isStatic: isStatic,
      restitution: 0.5,
      density: 10,
      //   inertia: 0,
      render: {
        fillStyle: color,
        strokeStyle: "darkblue",
        linewidth: 1,
        friction: 0.1,
      },
    };
    this.createBody();
  }

  smoothPoints(points) {
    const smoothedPoints = [];
    const len = points.length;

    for (let i = 0; i < len; ++i) {
      const prev = i === 0 ? points[len - 1] : points[i - 1];
      const curr = points[i];
      const next = i === len - 1 ? points[0] : points[i + 1];

      const prevEdge = Math.hypot(prev.x - curr.x, prev.y - curr.y);
      const nextEdge = Math.hypot(curr.x - next.x, curr.y - next.y);

      if (prevEdge > this.angleThreshold && nextEdge > this.angleThreshold) {
        const ratioPrev = this.smoothingDistance / prevEdge;
        const ratioNext = this.smoothingDistance / nextEdge;
        const smoothedPoint1 = {
          x: curr.x + ratioPrev * (prev.x - curr.x),
          y: curr.y + ratioPrev * (prev.y - curr.y),
        };
        const smoothedPoint2 = {
          x: curr.x + ratioNext * (next.x - curr.x),
          y: curr.y + ratioNext * (next.y - curr.y),
        };

        smoothedPoints.push(smoothedPoint1, smoothedPoint2);
      } else {
        smoothedPoints.push(curr);
      }
    }

    return smoothedPoints;
  }

  // Method to check if a point is inside a polygon
  insidePolygon(point) {
    const vertices = this.points;
    var inside = false;
    for (var i = 0; i < vertices.length; i++) {
      var xi = vertices[i].x,
        yi = vertices[i].y;
      var xj = vertices[(i + 1) % vertices.length].x,
        yj = vertices[(i + 1) % vertices.length].y;
      var intersect =
        yi > point.y != yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Method to select all upper edges in a polygon
  upperEdges() {
    if (this._upperEdges) {
      return this._upperEdges;
    }
    const upperEdges = [];

    const vertices = this.points;
    // const averageY =
    //   vertices.reduce((sum, vertice) => sum + vertice.y, 0) / vertices.length;

    for (let i = 0; i < vertices.length; i++) {
      const edgeStart = vertices[i];
      const edgeEnd = vertices[(i + 1) % vertices.length];
      const slope = (edgeEnd.y - edgeStart.y) / (edgeEnd.x - edgeStart.x);
      const edgeLength = Math.sqrt(
        Math.pow(edgeEnd.x - edgeStart.x, 2) +
          Math.pow(edgeEnd.y - edgeStart.y, 2)
      );

      // Not too steep and not too short
      if (Math.abs(slope) < 0.5 && edgeLength >= 20) {
        const edgeCenterX = (edgeStart.x + edgeEnd.x) / 2;
        const edgeCenterY = (edgeStart.y + edgeEnd.y) / 2;
        const pointAboveCenter = {
          x: edgeCenterX,
          y: edgeCenterY - 1, // A point 1 unit above the center
        };

        if (!this.insidePolygon(pointAboveCenter)) {
          upperEdges.push({ edgeStart, edgeEnd });
        }
      }
    }

    this._upperEdges = upperEdges;
    return upperEdges;
  }

  highlight() {
    // Fill style does not work for concave bodies
    // this.body.render.fillStyle = 'yellow';
    this.parent.uiManager.highlightedPolygon = this;
  }

  removeHighlight() {
    // this.body.render.fillStyle = this.originalColor;
    if (this.parent.uiManager.highlightedPolygon === this) {
      this.parent.uiManager.highlightedPolygon = null;
    }
  }

  // Helper function that checks if two line segments intersect
  lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the direction of the lines
    let uA =
      ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) /
      ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    let uB =
      ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) /
      ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    // If uA and uB are between 0-1, lines are colliding
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
      return true;
    }
    return false;
  }

  // Method to check if the polygon is valid
  isValidPolygon() {
    let len = this.points.length;

    for (let i = 0; i < len; i++) {
      let edge1StartX = this.points[i].x;
      let edge1StartY = this.points[i].y;
      let edge1EndX = this.points[(i + 1) % len].x;
      let edge1EndY = this.points[(i + 1) % len].y;

      for (let j = i + 2; j < len-1; j++) {
        let edge2StartX = this.points[j % len].x;
        let edge2StartY = this.points[j % len].y;
        let edge2EndX = this.points[(j + 1) % len].x;
        let edge2EndY = this.points[(j + 1) % len].y;

        if (
          this.lineIntersect(
            edge1StartX,
            edge1StartY,
            edge1EndX,
            edge1EndY,
            edge2StartX,
            edge2StartY,
            edge2EndX,
            edge2EndY
          )
        ) {
          return false;
        }
      }
    }
    return true;
  }
}

import { WIDTH, HEIGHT } from "./constants.js";
const CLOUD_ANIMATION_MAX_DELAY_SECONDS = 10;
class Cloud {
  constructor(img, width, height, top, left, speed, scale) {
    this.img = img;
    this.width = width;
    this.height = height;
    this.top = top;
    this.left = left;
    this.duration = 40 / (speed * scale);
    this.scale = scale;
    this.element = null;

    this.init();
  }

  init() {
    const cloud = document.createElement("img");
    cloud.src = this.img;
    cloud.style.position = "absolute";
    cloud.style.top = `${(this.top * 100) / HEIGHT}%`;
    cloud.style.left = `${(this.left * 100) / WIDTH}%`;
    cloud.style.width = `${(this.width * 100) / WIDTH}%`;
    cloud.style.height = `${(this.height * 100) / HEIGHT}%`;
    cloud.style.transform = `scale(${this.scale})`;
    cloud.style.zIndex = this.scale === 0.5 ? -2 : -1;

    if (this.scale < 1) {
      cloud.style.opacity = 0.75;
    }

    // Apply scale as CSS variabl
    cloud.style.setProperty("--scale", this.scale);
    // Get a random delay up to maxDelay
    const delay =
      -3600 - 2 * Math.floor(Math.random() * CLOUD_ANIMATION_MAX_DELAY_SECONDS);

    // Apply movement animation
    cloud.style.animation = `cloudMovement ${this.duration}s ${delay}s linear infinite`;
    cloud.style.animationFillMode = "backwards";

    this.element = cloud;

    const gameArea = document.getElementById("gameBackground");
    gameArea.appendChild(cloud);
  }
}

const cloudImages = ["img/cloud1.png", "img/cloud2.png", "img/cloud3.png"];

function createClouds() {
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const img = cloudImages[Math.floor(Math.random() * cloudImages.length)];
    const width = 200;
    const height = 100;
    const top = Math.random() * (HEIGHT + 50) - 50;
    const left = 0; //Math.random() * canvas.offsetWidth;
    const speed = Math.random() / 3 + 1;
    const scale = i < 5 ? 1 : 0.5;
    const cloud = new Cloud(
      img,
      width,
      height,
      top,
      left,
      scale * speed,
      scale
    );
    clouds.push(cloud);
  }
  return clouds;
}

createClouds();

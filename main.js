import * as THREE from "three";

/* =========================================================================
   TURBO SOCCER ARENA - a fan-made, unofficial car-soccer game.
   Original code & original physics model. Not affiliated with Psyonix/Epic
   Games or Rocket League(R). Built for fun as a tribute / parody project.
   ========================================================================= */

// ---------------------------------------------------------------- Constants
const ARENA = {
  halfX: 42,
  halfZ: 62,
  wallHeight: 24,
  goalHalfWidth: 9,
  goalHeight: 9.2,
  goalDepth: 7,
};

const PHYS = {
  gravity: 22,
  carAccel: 34,
  carBrake: 46,
  carMaxSpeed: 34,
  carMaxBoostSpeed: 52,
  turnRateBase: 2.6,
  turnRateFalloff: 0.55,
  airTurnRate: 3.0,
  airPitchRate: 3.4,
  lateralGripDrive: 0.14,
  lateralGripSlide: 0.85,
  boostAccel: 46,
  boostDrainPerSec: 34,
  jumpSpeed: 10.5,
  doubleJumpSpeed: 9,
  flipHorizSpeed: 15.5,
  flipUpSpeed: 3.5,
  supersonicThreshold: 40,
  carRadius: 1.75,
  restHeight: 0.62,
  ballRadius: 1.55,
  ballGravity: 20,
  ballDrag: 0.05,
  ballRestitution: 0.72,
  ballRollFriction: 0.55,
  ballMaxSpeed: 65,
  hitBaseImpulse: 6,
  hitTransfer: 1.15,
  boostPadSmall: 12,
  boostPadBig: 100,
};

const TEAM = { BLUE: 0, ORANGE: 1 };

// ---------------------------------------------------------------- Renderer
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1420);
scene.fog = new THREE.Fog(0x0a1420, 90, 220);

const camera = new THREE.PerspectiveCamera(82, window.innerWidth / window.innerHeight, 0.1, 500);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------- Lighting
const hemi = new THREE.HemisphereLight(0x8fbfff, 0x101018, 0.65);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.9);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0015;
scene.add(sun);
scene.add(sun.target);

// ---------------------------------------------------------------- Arena
const arenaGroup = new THREE.Group();
scene.add(arenaGroup);

function makeStripedField() {
  const size = 512;
  const cnv = document.createElement("canvas");
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "#12324a");
  grad.addColorStop(1, "#0d2536");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 4;
  const stripes = 10;
  for (let i = 0; i <= stripes; i++) {
    const y = (size / stripes) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(cnv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

const fieldTex = makeStripedField();
const floorMat = new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 0.85, metalness: 0.05 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.halfX * 2, ARENA.halfZ * 2), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
arenaGroup.add(floor);

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x9fd9ff, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0, transmission: 0.55, side: THREE.DoubleSide,
});
const wallFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c2a38, roughness: 0.6, metalness: 0.3 });

function addSideWall(x) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.halfZ * 2, ARENA.wallHeight), glassMat);
  wall.position.set(x, ARENA.wallHeight / 2, 0);
  wall.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
  arenaGroup.add(wall);
}
addSideWall(ARENA.halfX);
addSideWall(-ARENA.halfX);

function addBackWall(z, team) {
  const group = new THREE.Group();
  const fullW = ARENA.halfX * 2;
  const goalW = ARENA.goalHalfWidth * 2;
  const sideW = (fullW - goalW) / 2;

  const left = new THREE.Mesh(new THREE.PlaneGeometry(sideW, ARENA.wallHeight), glassMat);
  left.position.set(-(goalW / 2 + sideW / 2), ARENA.wallHeight / 2, z);
  left.rotation.y = z > 0 ? Math.PI : 0;
  group.add(left);

  const right = left.clone();
  right.position.x = goalW / 2 + sideW / 2;
  group.add(right);

  const top = new THREE.Mesh(new THREE.PlaneGeometry(goalW, ARENA.wallHeight - ARENA.goalHeight), glassMat);
  top.position.set(0, ARENA.goalHeight + (ARENA.wallHeight - ARENA.goalHeight) / 2, z);
  top.rotation.y = z > 0 ? Math.PI : 0;
  group.add(top);

  const netColor = team === TEAM.BLUE ? 0x4fb2ff : 0xff9a3d;
  const netMat = new THREE.MeshStandardMaterial({ color: netColor, wireframe: true, transparent: true, opacity: 0.55 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(goalW, ARENA.goalHeight, ARENA.goalDepth), netMat);
  back.position.set(0, ARENA.goalHeight / 2, z + (z > 0 ? ARENA.goalDepth / 2 : -ARENA.goalDepth / 2));
  group.add(back);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(goalW + 1, 0.6, 0.6), wallFrameMat);
  frame.position.set(0, ARENA.goalHeight, z);
  group.add(frame);

  arenaGroup.add(group);
}
addBackWall(-ARENA.halfZ, TEAM.BLUE);
addBackWall(ARENA.halfZ, TEAM.ORANGE);

// Boost pads
const PAD_DEFS = [
  { x: 0, z: 0, big: false },
  { x: 22, z: 0, big: false },
  { x: -22, z: 0, big: false },
  { x: 0, z: 30, big: false },
  { x: 0, z: -30, big: false },
  { x: 30, z: 46, big: true },
  { x: -30, z: 46, big: true },
  { x: 30, z: -46, big: true },
  { x: -30, z: -46, big: true },
];

class BoostPad {
  constructor(def) {
    this.x = def.x; this.z = def.z; this.big = def.big;
    this.radius = def.big ? 3.4 : 2.1;
    this.active = true;
    this.respawnTimer = 0;
    const h = def.big ? 2.4 : 1.1;
    const geo = new THREE.CylinderGeometry(this.radius, this.radius, h, 20);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffce6b, emissive: 0xff9a1a, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(this.x, h / 2, this.z);
    arenaGroup.add(this.mesh);
  }
  update(dt) {
    if (!this.active) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) { this.active = true; this.mesh.visible = true; }
    } else {
      this.mesh.rotation.y += dt * 1.2;
    }
  }
  consume() {
    this.active = false;
    this.mesh.visible = false;
    this.respawnTimer = this.big ? 10 : 5;
  }
}
const pads = PAD_DEFS.map((d) => new BoostPad(d));

// Center line + kickoff marker
const centerRing = new THREE.Mesh(
  new THREE.RingGeometry(9, 9.4, 48),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
);
centerRing.rotation.x = -Math.PI / 2;
centerRing.position.y = 0.02;
arenaGroup.add(centerRing);

// ---------------------------------------------------------------- Ball
class Ball {
  constructor() {
    this.pos = new THREE.Vector3(0, PHYS.ballRadius, 0);
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    const geo = new THREE.SphereGeometry(PHYS.ballRadius, 24, 18);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.15 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(PHYS.ballRadius * 1.001, 1),
      new THREE.MeshBasicMaterial({ color: 0x1a1f2a, wireframe: true, transparent: true, opacity: 0.55 })
    );
    this.mesh.add(wire);
    scene.add(this.mesh);

    this.trail = [];
    this.trailMesh = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.5 })
    );
    scene.add(this.trailMesh);
  }
  reset() {
    this.pos.set(0, PHYS.ballRadius, 0);
    this.vel.set(0, 0, 0);
    this.angVel.set(0, 0, 0);
  }
  update(dt) {
    this.vel.y -= PHYS.ballGravity * dt;
    this.vel.multiplyScalar(1 - PHYS.ballDrag * dt);
    this.pos.addScaledVector(this.vel, dt);

    if (this.pos.y <= PHYS.ballRadius) {
      this.pos.y = PHYS.ballRadius;
      if (this.vel.y < 0) this.vel.y *= -PHYS.ballRestitution;
      const horiz = Math.hypot(this.vel.x, this.vel.z);
      if (horiz > 0.001) {
        const f = Math.max(0, 1 - PHYS.ballRollFriction * dt);
        this.vel.x *= f; this.vel.z *= f;
      }
    }
    if (this.pos.y > ARENA.wallHeight - PHYS.ballRadius) {
      this.pos.y = ARENA.wallHeight - PHYS.ballRadius;
      if (this.vel.y > 0) this.vel.y *= -PHYS.ballRestitution;
    }
    const limX = ARENA.halfX - PHYS.ballRadius;
    if (this.pos.x > limX) { this.pos.x = limX; if (this.vel.x > 0) this.vel.x *= -PHYS.ballRestitution; }
    if (this.pos.x < -limX) { this.pos.x = -limX; if (this.vel.x < 0) this.vel.x *= -PHYS.ballRestitution; }

    const inGoalX = Math.abs(this.pos.x) < ARENA.goalHalfWidth - PHYS.ballRadius * 0.4;
    const inGoalY = this.pos.y < ARENA.goalHeight;
    const limZ = ARENA.halfZ - PHYS.ballRadius;
    if (this.pos.z > limZ && !(inGoalX && inGoalY)) {
      this.pos.z = limZ; if (this.vel.z > 0) this.vel.z *= -PHYS.ballRestitution;
    } else if (this.pos.z < -limZ && !(inGoalX && inGoalY)) {
      this.pos.z = -limZ; if (this.vel.z < 0) this.vel.z *= -PHYS.ballRestitution;
    }
    const netLimZ = ARENA.halfZ + ARENA.goalDepth - PHYS.ballRadius;
    if (this.pos.z > netLimZ) { this.pos.z = netLimZ; this.vel.z *= -0.3; }
    if (this.pos.z < -netLimZ) { this.pos.z = -netLimZ; this.vel.z *= -0.3; }

    const speed = this.vel.length();
    if (speed > PHYS.ballMaxSpeed) this.vel.multiplyScalar(PHYS.ballMaxSpeed / speed);

    if (speed > 0.05) {
      const axis = new THREE.Vector3(-this.vel.z, 0, this.vel.x).normalize();
      const angle = (speed / PHYS.ballRadius) * dt;
      this.mesh.rotateOnWorldAxis(axis, angle);
    }
    this.mesh.position.copy(this.pos);

    this.trail.push(this.pos.clone());
    if (this.trail.length > 14) this.trail.shift();
    if (speed > 14) {
      this.trailMesh.geometry.setFromPoints(this.trail);
      this.trailMesh.visible = true;
    } else {
      this.trailMesh.visible = false;
    }
  }
  checkGoal() {
    if (this.pos.z > ARENA.halfZ + PHYS.ballRadius * 0.6) return TEAM.BLUE;
    if (this.pos.z < -ARENA.halfZ - PHYS.ballRadius * 0.6) return TEAM.ORANGE;
    return null;
  }
}
const ball = new Ball();

// ---------------------------------------------------------------- Car
function buildCarMesh(color) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.5, metalness: 0.4 });
  const glassCarMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.15, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 3.4), bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.5), glassCarMat);
  cabin.position.set(0, 0.92, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.8), bodyMat);
  nose.position.set(0, 0.42, 1.85);
  group.add(nose);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.35), darkMat);
  spoiler.position.set(0, 0.95, -1.7);
  group.add(spoiler);
  const spoilerL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.35), darkMat);
  spoilerL.position.set(-0.7, 0.75, -1.7);
  group.add(spoilerL);
  const spoilerR = spoilerL.clone();
  spoilerR.position.x = 0.7;
  group.add(spoilerR);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  const wheels = [];
  [[-1.0, 0.42, 1.15], [1.0, 0.42, 1.15], [-1.0, 0.42, -1.15], [1.0, 0.42, -1.15]].forEach((p) => {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], p[1], p[2]);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  });

  const boostMat = new THREE.MeshBasicMaterial({ color: 0x7fd9ff, transparent: true, opacity: 0 });
  const boostFlame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 10), boostMat);
  boostFlame.rotation.x = Math.PI / 2;
  boostFlame.position.set(0, 0.42, -2.1);
  group.add(boostFlame);

  return { group, wheels, boostFlame };
}

class Car {
  constructor(team, isPlayer) {
    this.team = team;
    this.isPlayer = isPlayer;
    const dir = team === TEAM.BLUE ? 1 : -1;
    this.spawn = new THREE.Vector3(isPlayer ? 6 * dir : -6 * dir, PHYS.restHeight, dir * -30);
    this.pos = this.spawn.clone();
    this.vel = new THREE.Vector3();
    this.yaw = dir > 0 ? 0 : Math.PI;
    this.pitchVisual = 0;
    this.rollVisual = 0;
    this.onGround = true;
    this.boost = 33;
    this.isBoosting = false;
    this.supersonic = false;
    this.jumpHeld = false;
    this.jumpStage = 0;
    this.canAct = true;
    this.airTime = 0;
    this.flipTimer = 0;
    this.flipSpin = new THREE.Vector3();

    const color = team === TEAM.BLUE ? 0x2f7fe0 : 0xe0742f;
    const built = buildCarMesh(color);
    this.mesh = built.group;
    this.wheels = built.wheels;
    this.boostFlame = built.boostFlame;
    scene.add(this.mesh);
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  get right() {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  resetToSpawn(kickoff) {
    this.pos.copy(this.spawn);
    if (kickoff) this.pos.set(this.spawn.x, PHYS.restHeight, this.spawn.z);
    this.vel.set(0, 0, 0);
    this.onGround = true;
    this.jumpStage = 0;
    this.flipTimer = 0;
  }

  update(dt, controls) {
    const fwd = this.forward;
    const speed = this.vel.length();

    this.onGround = this.pos.y <= PHYS.restHeight + 0.02 && this.vel.y <= 0.01;
    if (this.onGround) {
      this.pos.y = PHYS.restHeight;
      this.vel.y = 0;
      this.jumpStage = 0;
      this.airTime = 0;
    } else {
      this.airTime += dt;
      this.vel.y -= PHYS.gravity * dt;
    }

    if (this.onGround) {
      const turnRate = PHYS.turnRateBase / (1 + speed * PHYS.turnRateFalloff * 0.05);
      const yawSign = controls.throttle < 0 ? -1 : 1;
      this.yaw += controls.steer * turnRate * dt * yawSign;
      if (Math.abs(controls.throttle) > 0.01) {
        this.vel.addScaledVector(fwd, controls.throttle * PHYS.carAccel * dt);
      } else if (speed > 0.05) {
        const decel = Math.min(speed, PHYS.carBrake * 0.4 * dt);
        this.vel.addScaledVector(this.vel.clone().normalize(), -decel);
      }
      const fwd2 = this.forward;
      const right2 = this.right;
      const vF = this.vel.dot(fwd2);
      const vR = this.vel.dot(right2);
      const grip = controls.handbrake ? PHYS.lateralGripSlide : PHYS.lateralGripDrive;
      const newVR = vR * (1 - Math.min(1, grip * (dt * 60)));
      this.vel.copy(fwd2.multiplyScalar(vF).add(right2.multiplyScalar(newVR)));
      this.vel.y = 0;
    } else {
      this.yaw += controls.steer * PHYS.airTurnRate * dt;
      this.pitchVisual = THREE.MathUtils.lerp(this.pitchVisual, controls.pitch * 0.5, dt * 4);
      this.rollVisual = THREE.MathUtils.lerp(this.rollVisual, controls.steer * 0.35, dt * 4);
    }

    if (controls.boost && this.boost > 0.5) {
      this.vel.addScaledVector(this.forward, PHYS.boostAccel * dt);
      this.boost = Math.max(0, this.boost - PHYS.boostDrainPerSec * dt);
      this.isBoosting = true;
    } else {
      this.isBoosting = false;
    }

    const jumpEdge = controls.jump && !this.jumpHeld;
    if (jumpEdge) {
      if (this.onGround && this.jumpStage === 0) {
        this.vel.y = PHYS.jumpSpeed;
        this.jumpStage = 1;
        this.onGround = false;
      } else if (!this.onGround && this.jumpStage === 1) {
        const dirMag = Math.hypot(controls.steer, controls.throttle);
        if (dirMag > 0.25) {
          const f = this.forward;
          const r = this.right;
          const flipDir = new THREE.Vector3()
            .addScaledVector(f, controls.throttle)
            .addScaledVector(r, controls.steer)
            .normalize();
          this.vel.x += flipDir.x * PHYS.flipHorizSpeed;
          this.vel.z += flipDir.z * PHYS.flipHorizSpeed;
          this.vel.y = PHYS.flipUpSpeed;
          this.flipTimer = 0.42;
          this.flipSpin.set(flipDir.z, 0, -flipDir.x);
        } else {
          this.vel.y = PHYS.doubleJumpSpeed;
        }
        this.jumpStage = 2;
      }
    }
    this.jumpHeld = controls.jump;

    const maxSpeed = this.isBoosting ? PHYS.carMaxBoostSpeed : PHYS.carMaxSpeed;
    const horizSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (horizSpeed > maxSpeed) {
      const s = maxSpeed / horizSpeed;
      this.vel.x *= s; this.vel.z *= s;
    }
    this.supersonic = horizSpeed > PHYS.supersonicThreshold;

    this.pos.addScaledVector(this.vel, dt);

    const limX = ARENA.halfX - PHYS.carRadius * 0.5;
    if (this.pos.x > limX) { this.pos.x = limX; if (this.vel.x > 0) this.vel.x *= -0.3; }
    if (this.pos.x < -limX) { this.pos.x = -limX; if (this.vel.x < 0) this.vel.x *= -0.3; }
    const inGoalX = Math.abs(this.pos.x) < ARENA.goalHalfWidth - 1;
    const limZ = ARENA.halfZ + (inGoalX ? ARENA.goalDepth - 1.5 : -PHYS.carRadius * 0.5);
    if (this.pos.z > limZ) { this.pos.z = limZ; if (this.vel.z > 0) this.vel.z *= -0.3; }
    if (this.pos.z < -limZ) { this.pos.z = -limZ; if (this.vel.z < 0) this.vel.z *= -0.3; }
    if (this.pos.y < PHYS.restHeight) { this.pos.y = PHYS.restHeight; this.vel.y = 0; }
    if (this.pos.y > ARENA.wallHeight - 1) { this.pos.y = ARENA.wallHeight - 1; if (this.vel.y > 0) this.vel.y = 0; }

    if (this.flipTimer > 0) this.flipTimer = Math.max(0, this.flipTimer - dt);
    else { this.pitchVisual = THREE.MathUtils.lerp(this.pitchVisual, 0, dt * 6); this.rollVisual = THREE.MathUtils.lerp(this.rollVisual, 0, dt * 6); }

    this.syncMesh(dt);
  }

  syncMesh(dt) {
    this.mesh.position.copy(this.pos);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitchVisual, this.yaw, this.rollVisual * (this.flipTimer > 0 ? 6 : 1), "YXZ"));
    this.mesh.quaternion.slerp(q, Math.min(1, dt * 10));
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.wheels.forEach((w) => (w.rotation.x -= speed * dt * 0.6));
    this.boostFlame.material.opacity = this.isBoosting ? 0.75 + Math.random() * 0.2 : THREE.MathUtils.lerp(this.boostFlame.material.opacity, 0, dt * 8);
    this.boostFlame.scale.set(1, 1, this.isBoosting ? 1 + Math.random() * 0.6 : 1);
  }
}

const playerCar = new Car(TEAM.BLUE, true);
const aiCar = new Car(TEAM.ORANGE, false);
const cars = [playerCar, aiCar];

// ---------------------------------------------------------------- Input
const keys = new Set();
const controls = { throttle: 0, steer: 0, pitch: 0, jump: false, boost: false, handbrake: false };
let ballCam = false;
let gameState = "menu";

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyC" && gameState === "playing") ballCam = !ballCam;
  if (e.code === "KeyR" && gameState === "playing") ball.reset();
  if (e.code === "Escape") {
    if (gameState === "playing") setPaused(true);
    else if (gameState === "paused") setPaused(false);
  }
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

function readControls() {
  const up = keys.has("KeyW") || keys.has("ArrowUp");
  const down = keys.has("KeyS") || keys.has("ArrowDown");
  const left = keys.has("KeyA") || keys.has("ArrowLeft");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  controls.throttle = (up ? 1 : 0) - (down ? 1 : 0);
  controls.steer = (left ? 1 : 0) - (right ? 1 : 0);
  controls.pitch = controls.throttle;
  controls.jump = keys.has("Space");
  controls.boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
  controls.handbrake = keys.has("ControlLeft") || keys.has("ControlRight");
}

// ---------------------------------------------------------------- Simple AI
function updateAI(car, dt) {
  const toBall = new THREE.Vector3().subVectors(ball.pos, car.pos);
  toBall.y = 0;
  const dist = toBall.length();
  const dir = car.team === TEAM.BLUE ? 1 : -1;
  const targetGoalZ = -dir * ARENA.halfZ;
  const aim = new THREE.Vector3().subVectors(ball.pos, new THREE.Vector3(0, 0, targetGoalZ));
  const targetPoint = dist < 14 ? new THREE.Vector3(ball.pos.x + aim.x * 0.15, 0, ball.pos.z + aim.z * 0.15) : ball.pos;

  const toTarget = new THREE.Vector3(targetPoint.x - car.pos.x, 0, targetPoint.z - car.pos.z);
  const targetYaw = Math.atan2(toTarget.x, toTarget.z);
  let yawDiff = targetYaw - car.yaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

  const ai = { throttle: 1, steer: 0, pitch: 0, jump: false, boost: false, handbrake: false };
  ai.steer = THREE.MathUtils.clamp(-yawDiff * 1.6, -1, 1);
  if (Math.abs(yawDiff) > 2.2) ai.throttle = -1;
  ai.boost = dist > 12 && Math.abs(yawDiff) < 0.5 && car.boost > 20;
  ai.handbrake = Math.abs(yawDiff) > 1.1;
  if (dist < 5 && ball.pos.y > 2.5 && car.onGround) ai.jump = Math.random() < 0.6;

  car.update(dt, ai);
}

// ---------------------------------------------------------------- Collisions
function resolveCarBall(car) {
  const diff = new THREE.Vector3().subVectors(ball.pos, car.pos);
  const dist = diff.length();
  const minDist = PHYS.carRadius + PHYS.ballRadius;
  if (dist < minDist && dist > 0.0001) {
    const normal = diff.clone().normalize();
    const overlap = minDist - dist;
    ball.pos.addScaledVector(normal, overlap);

    const closingSpeed = Math.max(0, car.vel.dot(normal));
    const impulse = PHYS.hitBaseImpulse + closingSpeed * PHYS.hitTransfer + (car.isBoosting ? 4 : 0);
    ball.vel.addScaledVector(normal, impulse);
    ball.vel.addScaledVector(car.vel, 0.35);
    if (normal.y > -0.2) ball.vel.y += 1.5;

    const speed = ball.vel.length();
    if (speed > PHYS.ballMaxSpeed) ball.vel.multiplyScalar(PHYS.ballMaxSpeed / speed);
  }
}

function resolveCarCar(a, b) {
  const diff = new THREE.Vector3().subVectors(b.pos, a.pos);
  const dist = diff.length();
  const minDist = PHYS.carRadius * 1.6;
  if (dist < minDist && dist > 0.0001) {
    const normal = diff.clone().normalize();
    const overlap = (minDist - dist) / 2;
    a.pos.addScaledVector(normal, -overlap);
    b.pos.addScaledVector(normal, overlap);
    const rel = a.vel.clone().sub(b.vel).dot(normal);
    a.vel.addScaledVector(normal, -rel * 0.5);
    b.vel.addScaledVector(normal, rel * 0.5);
  }
}

function checkPads(car) {
  for (const pad of pads) {
    if (!pad.active) continue;
    const dx = car.pos.x - pad.x, dz = car.pos.z - pad.z;
    if (Math.hypot(dx, dz) < pad.radius + PHYS.carRadius * 0.6) {
      car.boost = Math.min(100, car.boost + (pad.big ? PHYS.boostPadBig : PHYS.boostPadSmall));
      pad.consume();
    }
  }
}

// ---------------------------------------------------------------- Camera
const camState = { pos: new THREE.Vector3(0, 12, -22), look: new THREE.Vector3() };
function updateCamera(dt) {
  const car = playerCar;
  const behind = car.forward.clone().multiplyScalar(-11);
  const desired = car.pos.clone().add(behind).add(new THREE.Vector3(0, 5.5, 0));

  let lookTarget;
  if (ballCam) {
    lookTarget = ball.pos.clone();
    const mid = new THREE.Vector3().lerpVectors(car.pos, ball.pos, 0.35);
    desired.copy(mid).add(new THREE.Vector3(0, 6.5, 0)).addScaledVector(car.forward, -13);
  } else {
    lookTarget = car.pos.clone().addScaledVector(car.forward, 8).add(new THREE.Vector3(0, 1, 0));
  }

  camState.pos.lerp(desired, Math.min(1, dt * 4.5));
  camState.look.lerp(lookTarget, Math.min(1, dt * 6));
  camera.position.copy(camState.pos);
  camera.lookAt(camState.look);
}

// ---------------------------------------------------------------- UI wiring
const el = (id) => document.getElementById(id);
const scoreBlueEl = el("scoreBlue"), scoreOrangeEl = el("scoreOrange"), timerEl = el("timer");
const boostFillEl = el("boostFill"), boostValueEl = el("boostValue");
const goalBanner = el("goalBanner");
const menuEl = el("menu"), pauseEl = el("pause"), matchEndEl = el("matchEnd");
const matchResultEl = el("matchResult");

let score = { [TEAM.BLUE]: 0, [TEAM.ORANGE]: 0 };
let matchTime = 300;
let goalCooldown = 0;

function formatTime(t) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function resetKickoff() {
  ball.reset();
  playerCar.resetToSpawn(true);
  aiCar.resetToSpawn(true);
  pads.forEach((p) => { p.active = true; p.mesh.visible = true; p.respawnTimer = 0; });
}

function startMatch() {
  score = { [TEAM.BLUE]: 0, [TEAM.ORANGE]: 0 };
  matchTime = 300;
  scoreBlueEl.textContent = "0";
  scoreOrangeEl.textContent = "0";
  resetKickoff();
  gameState = "playing";
  menuEl.classList.add("hidden");
  pauseEl.classList.add("hidden");
  matchEndEl.classList.add("hidden");
}

function setPaused(p) {
  if (p) { gameState = "paused"; pauseEl.classList.remove("hidden"); }
  else { gameState = "playing"; pauseEl.classList.add("hidden"); }
}

function endMatch() {
  gameState = "ended";
  const b = score[TEAM.BLUE], o = score[TEAM.ORANGE];
  matchResultEl.textContent = b === o ? `Draw ${b} - ${o}` : b > o ? `Blue wins ${b} - ${o}!` : `Orange wins ${o} - ${b}!`;
  matchEndEl.classList.remove("hidden");
}

el("playBtn").addEventListener("click", startMatch);
el("resumeBtn").addEventListener("click", () => setPaused(false));
el("quitBtn").addEventListener("click", () => { gameState = "menu"; pauseEl.classList.add("hidden"); menuEl.classList.remove("hidden"); });
el("rematchBtn").addEventListener("click", startMatch);
el("menuBtn").addEventListener("click", () => { matchEndEl.classList.add("hidden"); menuEl.classList.remove("hidden"); gameState = "menu"; });

function showGoal(team) {
  goalBanner.textContent = `GOAL! ${team === TEAM.BLUE ? "BLUE" : "ORANGE"}`;
  goalBanner.classList.remove("hidden");
  goalBanner.classList.add("show");
  setTimeout(() => goalBanner.classList.remove("show"), 1400);
  setTimeout(() => goalBanner.classList.add("hidden"), 1650);
}

// ---------------------------------------------------------------- Main loop
let lastTime = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 1 / 20);

  if (gameState === "playing") {
    matchTime -= dt;
    if (matchTime <= 0 && goalCooldown <= 0) { matchTime = 0; endMatch(); }

    if (goalCooldown > 0) {
      goalCooldown -= dt;
    } else {
      readControls();
      playerCar.update(dt, controls);
      updateAI(aiCar, dt);
      ball.update(dt);

      resolveCarBall(playerCar);
      resolveCarBall(aiCar);
      resolveCarCar(playerCar, aiCar);
      checkPads(playerCar);
      checkPads(aiCar);
      pads.forEach((p) => p.update(dt));

      const scorer = ball.checkGoal();
      if (scorer !== null) {
        score[scorer]++;
        scoreBlueEl.textContent = score[TEAM.BLUE];
        scoreOrangeEl.textContent = score[TEAM.ORANGE];
        showGoal(scorer);
        resetKickoff();
        goalCooldown = 1.6;
      }
    }

    timerEl.textContent = formatTime(matchTime);
    boostFillEl.style.width = `${playerCar.boost}%`;
    boostValueEl.textContent = Math.round(playerCar.boost);
  }

  if (gameState === "playing" || gameState === "paused") {
    updateCamera(dt);
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

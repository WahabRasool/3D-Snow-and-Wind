import * as THREE from "https://cdn.skypack.dev/three@0.129.0";
class SnowAnimation {
    constructor(canvasSelector) {
        // Initialize canvas
        const canvas = document.querySelector(canvasSelector);
        if (!canvas)
            throw new Error("Canvas element not found");
        this.canvas = canvas;
        // Initialize properties
        this.geometry = null;
        this.material = null;
        this.points = null;
        this.previousTime = 0;
        this.clock = new THREE.Clock();
        // Setup snow parameters
        this.snow = {
            count: document.documentElement.clientWidth * 20,
            randomness: 0.5,
            randomnessPower: 3,
            sizeMin: 1.0,
            sizeMax: 4.0,
            opacityMin: 0.1,
            opacityMax: 0.4,
            gravity: 25.0
        };
        // Setup wind
        this.wind = {
            current: 0,
            force: 0.1,
            target: 0.1,
            min: 0.1,
            max: 0.2,
            easing: 0.005
        };
        // Initialize Three.js components
        this.scene = new THREE.Scene();
        this.scene.background = null;
        const { width, height } = this.getViewportSize();
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 100);
        this.camera.position.set(-0.25, 0, -2);
        this.scene.add(this.camera);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Setup event listeners
        window.addEventListener("resize", this.handleResize.bind(this));
        // Initialize snow
        this.generateSnow();
    }
    getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
    handleResize() {
        const { width, height } = this.getViewportSize();
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    generateSnow() {
        var _a, _b;
        if (this.points !== null) {
            (_a = this.geometry) === null || _a === void 0 ? void 0 : _a.dispose();
            (_b = this.material) === null || _b === void 0 ? void 0 : _b.dispose();
            this.scene.remove(this.points);
        }
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.snow.count * 3);
        const scales = new Float32Array(this.snow.count);
        const randomness = new Float32Array(this.snow.count * 3);
        const speeds = new Float32Array(this.snow.count * 3);
        const rotations = new Float32Array(this.snow.count * 3);
        const opacities = new Float32Array(this.snow.count);
        for (let i = 0; i < this.snow.count; i++) {
            const i3 = i * 2;
            // Set positions
            positions[i3] = (Math.random() - 0.5) * 12;
            positions[i3 + 1] = (Math.random() - 0.5) * 12;
            positions[i3 + 2] = (Math.random() - 0.5) * 12;
            // Calculate randomness
            const randomX = Math.pow(Math.random(), this.snow.randomnessPower) *
                (Math.random() < 0.5 ? 1 : -1) *
                this.snow.randomness;
            const randomY = Math.pow(Math.random(), this.snow.randomnessPower) *
                (Math.random() < 0.5 ? 1 : -1) *
                this.snow.randomness;
            const randomZ = Math.pow(Math.random(), this.snow.randomnessPower) *
                (Math.random() < 0.5 ? 1 : -1) *
                this.snow.randomness;
            randomness[i3] = randomX;
            randomness[i3 + 1] = randomY;
            randomness[i3 + 2] = randomZ;
            // Set opacities
            opacities[i] =
                Math.random() * (this.snow.opacityMax - this.snow.opacityMin) +
                    this.snow.opacityMin;
            // Set scales
            scales[i] =
                Math.random() * (this.snow.sizeMax - this.snow.sizeMin) + this.snow.sizeMin;
            // Set speeds
            speeds[i3] = 1 + Math.random();
            speeds[i3 + 1] = Math.random() * 0.01 + 0.05;
            speeds[i3 + 2] = Math.random() * 0.15 + 0.05;
            // Set rotations
            rotations[i3] = Math.random() * Math.PI * 2;
            rotations[i3 + 1] = Math.random() * 20;
            rotations[i3 + 2] = Math.random() * 10;
        }
        this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
        this.geometry.setAttribute("aRandomness", new THREE.BufferAttribute(randomness, 3));
        this.geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 3));
        this.geometry.setAttribute("aRotation", new THREE.BufferAttribute(rotations, 3));
        this.geometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
        const textureLoader = new THREE.TextureLoader();
        const particleTexture = textureLoader.load("https://assets.codepen.io/122136/snowflake_1.png");
        this.material = new THREE.ShaderMaterial({
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            vertexShader: this.getVertexShader(),
            fragmentShader: this.getFragmentShader(),
            uniforms: {
                uTime: { value: 0 },
                uSize: { value: 30 * this.renderer.getPixelRatio() },
                uSpeed: { value: new THREE.Vector3(0.0000001, 0.02, Math.random()) },
                uGravity: { value: this.snow.gravity },
                uWorldSize: { value: new THREE.Vector3(6, 6, 6) },
                uTexture: { value: particleTexture },
                uRotation: { value: new THREE.Vector3(1, 1, 1) },
                uWind: { value: 0 }
            }
        });
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }
    getVertexShader() {
        return `
      precision mediump float;

      attribute vec4 aPosition;
      attribute float aOpacity;
      attribute float aScale;
      attribute vec3 aRotation;
      attribute float aSize;
      attribute vec3 aSpeed;

      uniform float uTime;
      uniform float uSize;
      uniform float uGravity;
      uniform vec3 uSpeed;
      uniform vec3 uWorldSize;
      uniform mat4 uProjection;
      uniform float uWind;

      varying float vRotation;
      varying float vOpacity;

      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.5);
        vOpacity = aOpacity;
        vRotation = aRotation.x + uTime * aRotation.y;
        modelPosition.x = mod(modelPosition.x + uTime + uWind * aSpeed.x, uWorldSize.x * 2.0) - uWorldSize.x;
        modelPosition.y = mod(modelPosition.y - uTime * aSpeed.y * uGravity, uWorldSize.y * 2.0) - uWorldSize.y;
        modelPosition.x += (sin(uTime * aSpeed.z) * aRotation.z);
        modelPosition.z += cos(uTime * aSpeed.z) * aRotation.z;
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectedPosition = projectionMatrix * viewPosition;
        gl_Position = projectedPosition;
        gl_PointSize = uSize * aScale;
        gl_PointSize *= (1.0 / -viewPosition.z);
      }
    `;
    }
    getFragmentShader() {
        return `
      precision mediump float;
      varying float vOpacity;
      uniform sampler2D uTexture;
      varying float vRotation;

      void main() {
        vec2 rotated = vec2(
          cos(vRotation) * (gl_PointCoord.x - 0.5) + sin(vRotation) * (gl_PointCoord.y - 0.5) + 0.5,
          cos(vRotation) * (gl_PointCoord.y - 0.5) - sin(vRotation) * (gl_PointCoord.x - 0.5) + 0.5
        );
        vec4 snowflake = texture2D(uTexture, rotated);
        gl_FragColor = vec4(snowflake.rgb, snowflake.a * vOpacity);
      }
    `;
    }
    updateWind(deltaTime) {
        this.wind.force += (this.wind.target - this.wind.force) * this.wind.easing;
        this.wind.current += this.wind.force * (deltaTime * 0.2);
        if (Math.random() > 0.995) {
            this.wind.target =
                (this.wind.min + Math.random() * (this.wind.max - this.wind.min)) *
                    (Math.random() > 0.5 ? -1 : 1) *
                    100;
        }
    }
    animate() {
        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime = elapsedTime - this.previousTime;
        this.previousTime = elapsedTime;
        this.updateWind(deltaTime);
        if (this.material) {
            this.material.uniforms.uWind.value = this.wind.current;
            this.material.uniforms.uTime.value = elapsedTime;
        }
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(this.animate.bind(this));
    }
}
// Usage
const snowAnimation = new SnowAnimation("canvas");
snowAnimation.animate();

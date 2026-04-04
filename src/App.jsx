import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
   vertexShader,
   splatShader,
   curlShader,
   vorticityShader,
   divergenceShader,
   pressureShader,
   gradientSubtractShader,
   advectionShader,
   clearShader,
   displayFragmentShader,
} from "./shaders.js";
import MusicToggle from "./MusicToggle";
import CountdownTimer from "./CountdownTimer";
import LanguageToggle from "./LanguageToggle";
import { useLanguage } from "./LanguageContext";
import "./App.css";

function App() {
   const canvasRef = useRef(null);
   const { t } = useLanguage();

   useEffect(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const renderer = new THREE.WebGLRenderer({
         canvas,
         antialias: true,
         precision: "highp",
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const planeGeometry = new THREE.PlaneGeometry(2, 2);

      // --- Fluid Simulation Config ---
      const SIM_SIZE = 512;
      const VELOCITY_DISSIPATION = 0.98;
      const DENSITY_DISSIPATION = 0.97;
      const PRESSURE_DISSIPATION = 0.8;
      const PRESSURE_ITERATIONS = 20;
      const CURL_STRENGTH = 30;
      // Scale brush size down on smaller screens
      const screenScale = Math.min(window.innerWidth, window.innerHeight) / 1024;
      let brushScale = Math.max(0.4, Math.min(1, screenScale));
      let SPLAT_RADIUS = 0.004 * brushScale;
      const SPLAT_FORCE = 6000;
      const texelSize = new THREE.Vector2(1.0 / SIM_SIZE, 1.0 / SIM_SIZE);

      // --- FBO Helpers ---
      function createFBO(w, h) {
         return new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.HalfFloatType,
         });
      }

      function createDoubleFBO(w, h) {
         return {
            read: createFBO(w, h),
            write: createFBO(w, h),
            swap() {
               const temp = this.read;
               this.read = this.write;
               this.write = temp;
            },
         };
      }

      // --- Create Render Targets ---
      const velocity = createDoubleFBO(SIM_SIZE, SIM_SIZE);
      const density = createDoubleFBO(SIM_SIZE, SIM_SIZE);
      const pressure = createDoubleFBO(SIM_SIZE, SIM_SIZE);
      const divergenceFBO = createFBO(SIM_SIZE, SIM_SIZE);
      const curlFBO = createFBO(SIM_SIZE, SIM_SIZE);

      // Clear all FBOs
      const allFBOs = [
         velocity.read,
         velocity.write,
         density.read,
         density.write,
         pressure.read,
         pressure.write,
         divergenceFBO,
         curlFBO,
      ];
      allFBOs.forEach((fbo) => {
         renderer.setRenderTarget(fbo);
         renderer.clear();
      });
      renderer.setRenderTarget(null);

      // --- Simulation Scene (single mesh, material swapped per pass) ---
      const simScene = new THREE.Scene();
      const simMesh = new THREE.Mesh(planeGeometry, null);
      simScene.add(simMesh);

      // --- Simulation Materials ---
      const splatMat = new THREE.ShaderMaterial({
         uniforms: {
            uTarget: { value: null },
            aspectRatio: { value: window.innerWidth / window.innerHeight },
            color: { value: new THREE.Vector3() },
            point: { value: new THREE.Vector2() },
            radius: { value: SPLAT_RADIUS },
         },
         vertexShader,
         fragmentShader: splatShader,
         depthTest: false,
         depthWrite: false,
      });

      const curlMat = new THREE.ShaderMaterial({
         uniforms: {
            uVelocity: { value: null },
            texelSize: { value: texelSize },
         },
         vertexShader,
         fragmentShader: curlShader,
         depthTest: false,
         depthWrite: false,
      });

      const vorticityMat = new THREE.ShaderMaterial({
         uniforms: {
            uVelocity: { value: null },
            uCurl: { value: null },
            texelSize: { value: texelSize },
            curl: { value: CURL_STRENGTH },
            dt: { value: 0.016 },
         },
         vertexShader,
         fragmentShader: vorticityShader,
         depthTest: false,
         depthWrite: false,
      });

      const divergenceMat = new THREE.ShaderMaterial({
         uniforms: {
            uVelocity: { value: null },
            texelSize: { value: texelSize },
         },
         vertexShader,
         fragmentShader: divergenceShader,
         depthTest: false,
         depthWrite: false,
      });

      const pressureMat = new THREE.ShaderMaterial({
         uniforms: {
            uPressure: { value: null },
            uDivergence: { value: null },
            texelSize: { value: texelSize },
         },
         vertexShader,
         fragmentShader: pressureShader,
         depthTest: false,
         depthWrite: false,
      });

      const gradSubtractMat = new THREE.ShaderMaterial({
         uniforms: {
            uPressure: { value: null },
            uVelocity: { value: null },
            texelSize: { value: texelSize },
         },
         vertexShader,
         fragmentShader: gradientSubtractShader,
         depthTest: false,
         depthWrite: false,
      });

      const advectionMat = new THREE.ShaderMaterial({
         uniforms: {
            uVelocity: { value: null },
            uSource: { value: null },
            texelSize: { value: texelSize },
            dt: { value: 0.016 },
            dissipation: { value: VELOCITY_DISSIPATION },
         },
         vertexShader,
         fragmentShader: advectionShader,
         depthTest: false,
         depthWrite: false,
      });

      const clearMat = new THREE.ShaderMaterial({
         uniforms: {
            uTexture: { value: null },
            value: { value: PRESSURE_DISSIPATION },
         },
         vertexShader,
         fragmentShader: clearShader,
         depthTest: false,
         depthWrite: false,
      });

      // --- Display Setup ---
      const topTexture = createPlaceholderTexture("#0000ff");
      const bottomTexture = createPlaceholderTexture("#ff0000");
      const topTextureSize = new THREE.Vector2(1, 1);
      const bottomTextureSize = new THREE.Vector2(1, 1);

      const displayMaterial = new THREE.ShaderMaterial({
         uniforms: {
            uFluid: { value: null },
            uTopTexture: { value: topTexture },
            uBottomTexture: { value: bottomTexture },
            uResolution: {
               value: new THREE.Vector2(window.innerWidth, window.innerHeight),
            },
            uDpr: { value: window.devicePixelRatio },
            uTopTextureSize: { value: topTextureSize },
            uBottomTextureSize: { value: bottomTextureSize },
         },
         vertexShader,
         fragmentShader: displayFragmentShader,
      });

      const displayScene = new THREE.Scene();
      const displayMesh = new THREE.Mesh(planeGeometry, displayMaterial);
      displayScene.add(displayMesh);

      loadImage("/luffy-top.png", topTextureSize, displayMaterial, true);
      loadImage(
         "/luffyElbaph-bottom.png",
         bottomTextureSize,
         displayMaterial,
         false
      );

      // --- Helpers ---
      function createPlaceholderTexture(color) {
         const c = document.createElement("canvas");
         c.width = 512;
         c.height = 512;
         const ctx = c.getContext("2d");
         ctx.fillStyle = color;
         ctx.fillRect(0, 0, 512, 512);
         const texture = new THREE.CanvasTexture(c);
         texture.minFilter = THREE.LinearFilter;
         return texture;
      }

      function loadImage(url, textureSizeVector, material, isTop) {
         const img = new Image();
         img.crossOrigin = "Anonymous";

         img.onload = function () {
            const originalWidth = img.width;
            const originalHeight = img.height;
            textureSizeVector.set(originalWidth, originalHeight);

            console.log(
               `Loaded texture: ${url}, size: ${originalWidth}x${originalHeight}`
            );

            const maxSize = 4096;
            let newWidth = originalWidth;
            let newHeight = originalHeight;

            if (originalWidth > maxSize || originalHeight > maxSize) {
               console.log(`Image exceeds max texture size, resizing...`);
               if (originalWidth > originalHeight) {
                  newWidth = maxSize;
                  newHeight = Math.floor(
                     originalHeight * (maxSize / originalWidth)
                  );
               } else {
                  newHeight = maxSize;
                  newWidth = Math.floor(
                     originalWidth * (maxSize / originalHeight)
                  );
               }
            }

            const c = document.createElement("canvas");
            c.width = newWidth;
            c.height = newHeight;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const newTexture = new THREE.CanvasTexture(c);
            newTexture.minFilter = THREE.LinearFilter;
            newTexture.magFilter = THREE.LinearFilter;

            if (isTop) {
               material.uniforms.uTopTexture.value = newTexture;
            } else {
               material.uniforms.uBottomTexture.value = newTexture;
            }
         };

         img.onerror = function (err) {
            console.error(`Error loading image ${url}:`, err);
         };

         img.src = url;
      }

      // Render a fullscreen quad with the given material to the given target
      function blit(target, material) {
         simMesh.material = material;
         renderer.setRenderTarget(target);
         renderer.render(simScene, camera);
      }

      // --- Input State ---
      const mouse = { x: 0.5, y: 0.5 };
      const prevMouse = { x: 0.5, y: 0.5 };
      let isMoving = false;
      let lastMoveTime = performance.now();

      // --- Idle Animation State ---
      const idleDelay = 2000;
      let wasIdle = false;
      let idleStartTime = 0;
      let lastIdleCycleActive = false;
      const idlePointers = [
         { x: 0.1, y: 0.3 },
         { x: 0.9, y: 0.55 },
      ];

      function updateIdleAnimation(idleElapsed) {
         const strokeDuration = 2.5;
         const pauseDuration = 7.5;
         const totalCycle = strokeDuration + pauseDuration;
         const cycleTime = idleElapsed % totalCycle;
         const isActive = cycleTime <= strokeDuration;

         if (!isActive) {
            lastIdleCycleActive = false;
            return;
         }

         const progress = cycleTime / strokeDuration;

         // Stroke 0: left to right, y ≈ 0.3 with sine wave
         const x0 = 0.1 + progress * 0.8;
         const y0 = 0.3 + Math.sin(progress * Math.PI * 2) * 0.08;

         // Stroke 1: right to left, y ≈ 0.55 with sine wave
         const x1 = 0.9 - progress * 0.8;
         const y1 = 0.55 + Math.sin(progress * Math.PI * 1.5 + 0.5) * 0.06;

         if (!lastIdleCycleActive) {
            // New cycle starting — set positions without splatting
            idlePointers[0].x = x0;
            idlePointers[0].y = y0;
            idlePointers[1].x = x1;
            idlePointers[1].y = y1;
            lastIdleCycleActive = true;
            return;
         }

         // Compute movement deltas
         const dx0 = x0 - idlePointers[0].x;
         const dy0 = y0 - idlePointers[0].y;
         const dx1 = x1 - idlePointers[1].x;
         const dy1 = y1 - idlePointers[1].y;

         idlePointers[0].x = x0;
         idlePointers[0].y = y0;
         idlePointers[1].x = x1;
         idlePointers[1].y = y1;

         // Fade in/out within each stroke for smooth appearance
         const fadeIn = Math.min(progress / 0.15, 1.0);
         const fadeOut = Math.min((1.0 - progress) / 0.15, 1.0);
         const fade = fadeIn * fadeOut;

         const idleForce = 3000;
         const idleRadius = 0.006 * brushScale;
         const idleDensity = 0.2;

         // Splat stroke 0
         if (
            (Math.abs(dx0) > 0.00001 || Math.abs(dy0) > 0.00001) &&
            fade > 0.01
         ) {
            splatMat.uniforms.uTarget.value = velocity.read.texture;
            splatMat.uniforms.point.value.set(x0, y0);
            splatMat.uniforms.color.value.set(
               dx0 * idleForce * fade,
               dy0 * idleForce * fade,
               0
            );
            splatMat.uniforms.radius.value = idleRadius;
            blit(velocity.write, splatMat);
            velocity.swap();

            splatMat.uniforms.uTarget.value = density.read.texture;
            splatMat.uniforms.color.value.set(idleDensity * fade, 0, 0);
            blit(density.write, splatMat);
            density.swap();
         }

         // Splat stroke 1
         if (
            (Math.abs(dx1) > 0.00001 || Math.abs(dy1) > 0.00001) &&
            fade > 0.01
         ) {
            splatMat.uniforms.uTarget.value = velocity.read.texture;
            splatMat.uniforms.point.value.set(x1, y1);
            splatMat.uniforms.color.value.set(
               dx1 * idleForce * fade,
               dy1 * idleForce * fade,
               0
            );
            splatMat.uniforms.radius.value = idleRadius;
            blit(velocity.write, splatMat);
            velocity.swap();

            splatMat.uniforms.uTarget.value = density.read.texture;
            splatMat.uniforms.color.value.set(idleDensity * fade, 0, 0);
            blit(density.write, splatMat);
            density.swap();
         }
      }

      // --- Event Handlers ---
      function onMouseMove(event) {
         const canvasRect = canvas.getBoundingClientRect();

         if (
            event.clientX >= canvasRect.left &&
            event.clientX <= canvasRect.right &&
            event.clientY >= canvasRect.top &&
            event.clientY <= canvasRect.bottom
         ) {
            prevMouse.x = mouse.x;
            prevMouse.y = mouse.y;

            mouse.x = (event.clientX - canvasRect.left) / canvasRect.width;
            mouse.y =
               1 - (event.clientY - canvasRect.top) / canvasRect.height;

            isMoving = true;
            lastMoveTime = performance.now();
            lastIdleCycleActive = false;
         } else {
            isMoving = false;
         }
      }

      function onTouchMove(event) {
         if (event.touches.length > 0) {
            event.preventDefault();

            const canvasRect = canvas.getBoundingClientRect();
            const touchX = event.touches[0].clientX;
            const touchY = event.touches[0].clientY;

            if (
               touchX >= canvasRect.left &&
               touchX <= canvasRect.right &&
               touchY >= canvasRect.top &&
               touchY <= canvasRect.bottom
            ) {
               prevMouse.x = mouse.x;
               prevMouse.y = mouse.y;

               mouse.x = (touchX - canvasRect.left) / canvasRect.width;
               mouse.y =
                  1 - (touchY - canvasRect.top) / canvasRect.height;

               isMoving = true;
               lastMoveTime = performance.now();
               lastIdleCycleActive = false;
            } else {
               isMoving = false;
            }
         }
      }

      function onWindowResize() {
         renderer.setSize(window.innerWidth, window.innerHeight);

         displayMaterial.uniforms.uResolution.value.set(
            window.innerWidth,
            window.innerHeight
         );
         displayMaterial.uniforms.uDpr.value = window.devicePixelRatio;
         splatMat.uniforms.aspectRatio.value =
            window.innerWidth / window.innerHeight;

         // Recalculate brush scale for new screen size
         const newScale = Math.min(window.innerWidth, window.innerHeight) / 1024;
         brushScale = Math.max(0.4, Math.min(1, newScale));
         SPLAT_RADIUS = 0.004 * brushScale;
      }

      // --- Animation Loop ---
      let lastTime = performance.now();

      function animate() {
         requestAnimationFrame(animate);

         const now = performance.now();
         let dt = (now - lastTime) / 1000.0;
         lastTime = now;
         dt = Math.min(dt, 1.0 / 30.0); // Cap at ~30fps equivalent

         // Check if mouse stopped
         if (isMoving && now - lastMoveTime > 50) {
            isMoving = false;
         }

         // --- Mouse/Touch Splats ---
         if (isMoving) {
            const dx = mouse.x - prevMouse.x;
            const dy = mouse.y - prevMouse.y;

            if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
               // Splat velocity
               splatMat.uniforms.uTarget.value = velocity.read.texture;
               splatMat.uniforms.point.value.set(mouse.x, mouse.y);
               splatMat.uniforms.color.value.set(
                  dx * SPLAT_FORCE,
                  dy * SPLAT_FORCE,
                  0
               );
               splatMat.uniforms.radius.value = SPLAT_RADIUS;
               blit(velocity.write, splatMat);
               velocity.swap();

               // Splat density (R channel — used as image blend mask)
               splatMat.uniforms.uTarget.value = density.read.texture;
               splatMat.uniforms.color.value.set(0.5, 0, 0);
               blit(density.write, splatMat);
               density.swap();
            }
         }

         // --- Idle Animation Splats ---
         const timeSinceMove = now - lastMoveTime;
         const shouldBeIdle = timeSinceMove > idleDelay;

         if (shouldBeIdle) {
            if (!wasIdle) {
               wasIdle = true;
               idleStartTime = now;
               lastIdleCycleActive = false;
            }
            const idleElapsed = (now - idleStartTime) / 1000.0;
            updateIdleAnimation(idleElapsed);
         } else {
            wasIdle = false;
            lastIdleCycleActive = false;
         }

         // === Navier-Stokes Fluid Simulation ===

         // 1. Compute curl of velocity
         curlMat.uniforms.uVelocity.value = velocity.read.texture;
         blit(curlFBO, curlMat);

         // 2. Apply vorticity confinement (creates swirling motion)
         vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
         vorticityMat.uniforms.uCurl.value = curlFBO.texture;
         vorticityMat.uniforms.dt.value = dt;
         blit(velocity.write, vorticityMat);
         velocity.swap();

         // 3. Compute divergence of velocity
         divergenceMat.uniforms.uVelocity.value = velocity.read.texture;
         blit(divergenceFBO, divergenceMat);

         // 4. Decay pressure from previous frame
         clearMat.uniforms.uTexture.value = pressure.read.texture;
         clearMat.uniforms.value.value = PRESSURE_DISSIPATION;
         blit(pressure.write, clearMat);
         pressure.swap();

         // 5. Jacobi pressure solve (20 iterations)
         pressureMat.uniforms.uDivergence.value = divergenceFBO.texture;
         for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
            pressureMat.uniforms.uPressure.value = pressure.read.texture;
            blit(pressure.write, pressureMat);
            pressure.swap();
         }

         // 6. Subtract pressure gradient — makes velocity divergence-free
         gradSubtractMat.uniforms.uPressure.value = pressure.read.texture;
         gradSubtractMat.uniforms.uVelocity.value = velocity.read.texture;
         blit(velocity.write, gradSubtractMat);
         velocity.swap();

         // 7. Advect velocity (velocity moves itself)
         advectionMat.uniforms.uVelocity.value = velocity.read.texture;
         advectionMat.uniforms.uSource.value = velocity.read.texture;
         advectionMat.uniforms.dt.value = dt;
         advectionMat.uniforms.dissipation.value = VELOCITY_DISSIPATION;
         blit(velocity.write, advectionMat);
         velocity.swap();

         // 8. Advect density (density is carried by the fluid)
         advectionMat.uniforms.uVelocity.value = velocity.read.texture;
         advectionMat.uniforms.uSource.value = density.read.texture;
         advectionMat.uniforms.dt.value = dt;
         advectionMat.uniforms.dissipation.value = DENSITY_DISSIPATION;
         blit(density.write, advectionMat);
         density.swap();

         // === Display Pass ===
         displayMaterial.uniforms.uFluid.value = density.read.texture;
         renderer.setRenderTarget(null);
         renderer.render(displayScene, camera);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("resize", onWindowResize);

      animate();

      return () => {
         window.removeEventListener("mousemove", onMouseMove);
         window.removeEventListener("touchmove", onTouchMove);
         window.removeEventListener("resize", onWindowResize);
         renderer.dispose();
         allFBOs.forEach((fbo) => fbo.dispose());
         planeGeometry.dispose();
         splatMat.dispose();
         curlMat.dispose();
         vorticityMat.dispose();
         divergenceMat.dispose();
         pressureMat.dispose();
         gradSubtractMat.dispose();
         advectionMat.dispose();
         clearMat.dispose();
         displayMaterial.dispose();
      };
   }, []);

   return (
      <>
         <nav>
            <div className="site-name">
               <a href="#">
                  <span className="site-name-main">One Piece</span>
                  <div className="site-name-sub-wrapper">
                     <div className="decorative-line decorative-line-left"></div>
                     <span className="site-name-sub">{t.siteSubtitle}</span>
                     <div className="decorative-line decorative-line-right"></div>
                  </div>
               </a>
            </div>
            <MusicToggle />
         </nav>

         <CountdownTimer />

         <section className="hero">
            <canvas ref={canvasRef}></canvas>

            <div className="hero-footer">
               <LanguageToggle />
            </div>
         </section>
      </>
   );
}

export default App;

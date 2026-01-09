import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
   vertexShader,
   fluidFragmentShader,
   displayFragmentShader,
} from "./shaders.js";
import MusicToggle from "./MusicToggle";
import CountdownTimer from "./CountdownTimer";
import "./App.css";

function App() {
   const canvasRef = useRef(null);

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

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const mouse = new THREE.Vector2(0.5, 0.5);
      const prevMouse = new THREE.Vector2(0.5, 0.5);
      let isMoving = false;
      const startTime = performance.now();
      let lastMoveTime = startTime; // Initialize to start time
      let idleAnimationActive = false;
      const idleDelayTime = 2000; // Start idle animation after 2 seconds

      const size = 500;
      const pingPongTargets = [
         new THREE.WebGLRenderTarget(size, size, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
         }),
         new THREE.WebGLRenderTarget(size, size, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
         }),
      ];
      let currentTarget = 0;

      const topTexture = createPlaceholderTexture("#0000ff");
      const bottomTexture = createPlaceholderTexture("#ff0000");

      const topTextureSize = new THREE.Vector2(1, 1);
      const bottomTextureSize = new THREE.Vector2(1, 1);

      const trailsMaterial = new THREE.ShaderMaterial({
         uniforms: {
            uPrevTrails: { value: null },
            uMouse: { value: mouse },
            uPrevMouse: { value: prevMouse },
            uResolution: { value: new THREE.Vector2(size, size) },
            uDecay: { value: 0.97 },
            uIsMoving: { value: false },
            uTime: { value: 0.0 },
            uIdleAnimation: { value: false },
            uIdleFadeOut: { value: 1.0 },
         },
         vertexShader,
         fragmentShader: fluidFragmentShader,
      });

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

      loadImage("/luffy-top.png", topTextureSize, displayMaterial, true);
      loadImage(
         "/luffyElbaph-bottom.png",
         bottomTextureSize,
         displayMaterial,
         false
      );

      const planeGeometry = new THREE.PlaneGeometry(2, 2);
      const displayMesh = new THREE.Mesh(planeGeometry, displayMaterial);
      scene.add(displayMesh);

      const simMesh = new THREE.Mesh(planeGeometry, trailsMaterial);
      const simScene = new THREE.Scene();
      simScene.add(simMesh);

      renderer.setRenderTarget(pingPongTargets[0]);
      renderer.clear();
      renderer.setRenderTarget(pingPongTargets[1]);
      renderer.clear();
      renderer.setRenderTarget(null);

      function createPlaceholderTexture(color) {
         const canvas = document.createElement("canvas");
         canvas.width = 512;
         canvas.height = 512;
         const ctx = canvas.getContext("2d");
         ctx.fillStyle = color;
         ctx.fillRect(0, 0, 512, 512);

         const texture = new THREE.CanvasTexture(canvas);
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

            const canvas = document.createElement("canvas");
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const newTexture = new THREE.CanvasTexture(canvas);
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

      function onMouseMove(event) {
         const canvasRect = canvas.getBoundingClientRect();

         if (
            event.clientX >= canvasRect.left &&
            event.clientX <= canvasRect.right &&
            event.clientY >= canvasRect.top &&
            event.clientY <= canvasRect.bottom
         ) {
            prevMouse.copy(mouse);

            mouse.x = (event.clientX - canvasRect.left) / canvasRect.width;
            mouse.y = 1 - (event.clientY - canvasRect.top) / canvasRect.height;

            isMoving = true;
            lastMoveTime = performance.now();
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
               prevMouse.copy(mouse);

               mouse.x = (touchX - canvasRect.left) / canvasRect.width;
               mouse.y = 1 - (touchY - canvasRect.top) / canvasRect.height;

               isMoving = true;
               lastMoveTime = performance.now();
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
      }

      function animate() {
         requestAnimationFrame(animate);

         const currentTime = performance.now();

         if (isMoving && currentTime - lastMoveTime > 50) {
            isMoving = false;
         }

         // Check if user has been idle for long enough to start idle animation
         const timeSinceLastMove = currentTime - lastMoveTime;
         const shouldBeIdle = timeSinceLastMove > idleDelayTime;

         // Update time uniform (in seconds)
         const elapsedTime = (currentTime - startTime) / 1000.0;
         trailsMaterial.uniforms.uTime.value = elapsedTime;

         // Simple approach: just turn animation on/off based on idle state
         if (shouldBeIdle) {
            idleAnimationActive = true;
            trailsMaterial.uniforms.uIdleFadeOut.value = 1.0;
         } else {
            // User moved - start fade out
            const currentFade = trailsMaterial.uniforms.uIdleFadeOut.value;
            if (currentFade > 0.01) {
               // Quick fade out
               const newFade = currentFade * 0.85; // Exponential decay
               trailsMaterial.uniforms.uIdleFadeOut.value = newFade;
               idleAnimationActive = true; // Keep running while fading
            } else {
               // Fade complete, fully disable
               trailsMaterial.uniforms.uIdleFadeOut.value = 0.0;
               idleAnimationActive = false;
            }
         }

         const prevTarget = pingPongTargets[currentTarget];
         currentTarget = (currentTarget + 1) % 2;
         const currentRenderTarget = pingPongTargets[currentTarget];

         trailsMaterial.uniforms.uPrevTrails.value = prevTarget.texture;
         trailsMaterial.uniforms.uMouse.value.copy(mouse);
         trailsMaterial.uniforms.uPrevMouse.value.copy(prevMouse);
         trailsMaterial.uniforms.uIsMoving.value = isMoving;
         trailsMaterial.uniforms.uIdleAnimation.value = idleAnimationActive;

         renderer.setRenderTarget(currentRenderTarget);
         renderer.render(simScene, camera);

         displayMaterial.uniforms.uFluid.value = currentRenderTarget.texture;

         renderer.setRenderTarget(null);
         renderer.render(scene, camera);
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
         pingPongTargets[0].dispose();
         pingPongTargets[1].dispose();
         planeGeometry.dispose();
         trailsMaterial.dispose();
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
                     <span className="site-name-sub">Elbaph Arc</span>
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
               <p>Elbaf Arc</p>
               <p>2025</p>
            </div>
         </section>
      </>
   );
}

export default App;

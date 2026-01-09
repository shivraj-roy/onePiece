const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fluidFragmentShader = `
  uniform sampler2D uPrevTrails;
  uniform vec2 uMouse;
  uniform vec2 uPrevMouse;
  uniform vec2 uResolution;
  uniform float uDecay;
  uniform bool uIsMoving;
  uniform float uTime;
  uniform bool uIdleAnimation;
  uniform float uIdleFadeOut;

  varying vec2 vUv;

  // Hash function for pseudo-randomness
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec4 prevState = texture2D(uPrevTrails, vUv);

    float newValue = prevState.r * uDecay;

    if (uIsMoving) {
      vec2 mouseDirection = uMouse - uPrevMouse;
      float lineLength = length(mouseDirection);

      if (lineLength > 0.001) {
        vec2 mouseDir = mouseDirection / lineLength;

        vec2 toPixel = vUv - uPrevMouse;
        float projAlong = dot(toPixel, mouseDir);
        projAlong = clamp(projAlong, 0.0, lineLength);

        vec2 closestPoint = uPrevMouse + projAlong * mouseDir;
        float dist = length(vUv - closestPoint);

        float lineWidth = 0.09;
        float intensity = smoothstep(lineWidth, 0.0, dist) * 0.3;

        newValue += intensity;
      }
    }

    // Idle animation - random strokes moving across screen
    if (uIdleAnimation) {
      float idleIntensity = 0.0;

      // Create 2 animated strokes with synchronized timing
      for (float i = 0.0; i < 2.0; i++) {
        // Timing: 2.5s animation + 5.5s pause = 8s total cycle
        float strokeDuration = 2.5; // Stroke completes in 2.5 seconds
        float pauseDuration = 5.5; // 5.5 second pause after strokes
        float totalCycle = strokeDuration + pauseDuration;

        // Both strokes share the same cycle (synchronized)
        float cycleTime = mod(uTime, totalCycle);

        // Only show strokes during active period
        if (cycleTime > strokeDuration) {
          continue; // In pause period - skip all strokes
        }

        // Stroke progress (0 to 1) during active period only
        float progress = cycleTime / strokeDuration;

        // Y position - shifted down (lower on screen) with spacing
        // First stroke at 0.25, second at 0.5 for lower positioning
        float yPos = 0.25 + i * 0.25; // Creates gap: 0.25 and 0.5

        // Random direction (left-to-right or right-to-left) - use hash2
        float directionRand = hash2(vec2(i * 34.56, 78.90));

        // Random start and end points - use hash2 for better variety
        float rand1 = hash2(vec2(i * 45.67, 89.01));
        float rand2 = hash2(vec2(i * 56.78, 90.12));

        float startX, endX;

        if (directionRand > 0.5) {
          // Left to right movement - more constrained, can start/end in middle
          startX = mix(-0.1, 0.6, rand1); // Start from left edge to middle-right
          endX = mix(0.3, 1.1, rand2);     // End from middle-left to right edge
        } else {
          // Right to left movement - more constrained, can start/end in middle
          startX = mix(0.4, 1.1, rand1);   // Start from middle-right to right edge
          endX = mix(-0.1, 0.7, rand2);    // End from left edge to middle-right
        }

        // Current X position of stroke based on progress
        float currentX = mix(startX, endX, progress);

        // Direction for stroke segment rendering
        float direction = sign(endX - startX);

        // Stroke start and end points (small stroke segment)
        vec2 strokeStart = vec2(currentX, yPos);
        vec2 strokeEnd = vec2(currentX + direction * 0.15, yPos + (hash2(vec2(i * 67.89, 101.23)) - 0.5) * 0.1);

        // Calculate distance to this stroke
        vec2 strokeDir = normalize(strokeEnd - strokeStart);
        float strokeLength = length(strokeEnd - strokeStart);

        vec2 toPixel = vUv - strokeStart;
        float projAlong = dot(toPixel, strokeDir);
        projAlong = clamp(projAlong, 0.0, strokeLength);

        vec2 closestPoint = strokeStart + projAlong * strokeDir;
        float dist = length(vUv - closestPoint);

        // Subtle stroke width
        float lineWidth = 0.08;

        // Fade in at start, fade out at end for smooth animation
        float fadeIn = smoothstep(0.0, 0.15, progress);
        float fadeOut = smoothstep(1.0, 0.85, progress);
        float fade = fadeIn * fadeOut;

        // Apply user interaction fade-out
        fade *= uIdleFadeOut;

        float strokeIntensity = smoothstep(lineWidth, 0.0, dist) * 0.15 * fade;

        idleIntensity += strokeIntensity;
      }

      newValue += idleIntensity;
    }

    gl_FragColor = vec4(newValue, 0.0, 0.0, 1.0);
  }
`;

const displayFragmentShader = `
  uniform sampler2D uFluid;
  uniform sampler2D uTopTexture;
  uniform sampler2D uBottomTexture;
  uniform vec2 uResolution;
  uniform float uDpr;
  uniform vec2 uTopTextureSize;
  uniform vec2 uBottomTextureSize;

  varying vec2 vUv;

  vec2 getCoverUV(vec2 uv, vec2 textureSize) {
    if (textureSize.x < 1.0 || textureSize.y < 1.0) return uv;

    vec2 s = uResolution / textureSize;

    float scale = max(s.x, s.y);

    vec2 scaledSize = textureSize * scale;

    vec2 offset = (uResolution - scaledSize) * 0.5;

    return (uv * uResolution - offset) / scaledSize;
  }

  void main() {
    float fluid = texture2D(uFluid, vUv).r;

    vec2 topUV = getCoverUV(vUv, uTopTextureSize);
    vec2 bottomUV = getCoverUV(vUv, uBottomTextureSize);

    vec4 topColor = texture2D(uTopTexture, topUV);
    vec4 bottomColor = texture2D(uBottomTexture, bottomUV);

    float threshold = 0.02;
    float edgeWidth = 0.004 / uDpr;

    float t = smoothstep(threshold, threshold + edgeWidth, fluid);

    vec4 finalColor = mix(topColor, bottomColor, t);

    gl_FragColor = finalColor;
  }
`;

export { vertexShader, fluidFragmentShader, displayFragmentShader };

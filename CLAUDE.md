# One Piece - Interactive Fluid Dynamics Landing Page

An interactive portfolio landing page featuring GPU-accelerated fluid dynamics that blend between two images based on mouse/touch interaction. Built with React, Three.js, and custom GLSL shaders.

## Overview

This project creates an immersive visual experience where user movements generate flowing particle trails that dynamically transition between two portrait images. The fluid simulation runs entirely on the GPU for smooth, high-performance rendering.

## Features

- **GPU-Accelerated Fluid Simulation**: Custom GLSL shaders for real-time particle physics
- **Ping-Pong Rendering**: Advanced texture swapping technique for temporal effects
- **Interactive Controls**: Full mouse and touch support with smooth trail generation
- **Responsive Design**: Adapts to all screen sizes with high-DPI display support
- **Image Blending**: Seamless transitions between images based on fluid intensity
- **Aspect Ratio Preservation**: CSS-like "cover" behavior for proper image scaling

## Tech Stack

- **React 19** - UI framework with hooks
- **Three.js 0.182** - WebGL rendering engine
- **Vite 7** - Fast build tool with HMR
- **GLSL** - Custom vertex and fragment shaders
- **ESLint** - Code quality and linting

## Project Structure

```
onePiece/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main component with WebGL logic
│   ├── shaders.js            # GLSL shader definitions
│   ├── App.css               # Component styling
│   └── index.css             # Global styles
├── public/
│   ├── luffy-top.png         # Top blending image
│   └── luffy-bottom.png      # Bottom blending image
├── index.html                # HTML entry point
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration
└── eslint.config.js          # Linting rules
```

## How It Works

### 1. Fluid Simulation (fluidFragmentShader)

The fluid simulation uses a decay-based particle system:

```glsl
// Read previous frame with decay
vec4 prev = texture2D(uPrevTrails, vUv);
float decay = 0.97;
float trails = prev.r * decay;

// Calculate distance from mouse path
vec2 closestPoint = calculateClosestPointOnLine(vUv, uPrevMouse, uMouse);
float dist = distance(vUv, closestPoint);

// Add smooth brush strokes
float intensity = smoothstep(brushSize + edge, brushSize - edge, dist);
trails = min(trails + intensity, 1.0);
```

**Key concepts:**
- Each frame fades by 3% (0.97 decay factor)
- Calculates shortest distance from pixel to mouse movement line
- Uses `smoothstep` for anti-aliased brush edges
- Stores intensity in red channel

### 2. Ping-Pong Rendering Pattern

Uses two render targets that alternate each frame:

```javascript
// Frame N: Read from Target A, write to Target B
// Frame N+1: Read from Target B, write to Target A

const prevTarget = pingPongTargets[currentTarget];
currentTarget = (currentTarget + 1) % 2;
const currentRenderTarget = pingPongTargets[currentTarget];

trailsMaterial.uniforms.uPrevTrails.value = prevTarget.texture;
renderer.setRenderTarget(currentRenderTarget);
renderer.render(simScene, camera);
```

This allows shaders to read the previous frame's state while writing the new frame.

### 3. Image Blending (displayFragmentShader)

The display shader blends two images based on fluid values:

```glsl
// Get fluid intensity
float fluidValue = texture2D(uFluid, vUv).r;

// Smooth threshold transition
float threshold = 0.02;
float edge = 0.005 / uDpr;
float mask = smoothstep(threshold - edge, threshold + edge, fluidValue);

// Blend between images
vec4 topColor = texture2D(uTopTexture, topUV);
vec4 bottomColor = texture2D(uBottomTexture, bottomUV);
gl_FragColor = mix(bottomColor, topColor, mask);
```

**Features:**
- DPR-aware edge smoothing for crisp rendering
- `getCoverUV` function preserves aspect ratios
- Smooth transitions using `smoothstep`

### 4. Interaction System

Captures and normalizes mouse/touch coordinates:

```javascript
// Convert screen coordinates to UV space (0-1)
mouse.x = (event.clientX - canvasRect.left) / canvasRect.width;
mouse.y = 1 - (event.clientY - canvasRect.top) / canvasRect.height;

// Track previous position for line drawing
prevMouse.copy(mouse);

// 50ms timeout for inactivity detection
if (performance.now() - lastMoveTime > 50) {
    isMoving = false;
}
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Configuration

### Changing Images

Replace the images in `/public`:
- `luffy-top.png` - Image shown when fluid is present
- `luffy-bottom.png` - Image shown in areas without fluid

Update paths in `App.jsx`:

```javascript
loadImage("/luffy-top.png", topTextureSize, displayMaterial, true);
loadImage("/luffy-bottom.png", bottomTextureSize, displayMaterial, false);
```

### Adjusting Fluid Behavior

Modify shader uniforms in `App.jsx`:

```javascript
const trailsMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uDecay: { value: 0.97 },  // Trail fade rate (0-1)
        // Higher = slower fade, more persistent trails
    },
    // ...
});
```

In `shaders.js`, adjust:

```javascript
// Brush size and edge softness
float brushSize = 0.05;  // Larger = thicker trails
float edge = 0.02;       // Larger = softer edges
```

### Performance Tuning

Control render target size in `App.jsx`:

```javascript
const size = 500;  // Fluid simulation resolution
// Lower = better performance, less detail
// Higher = more detail, slower performance
```

Limit device pixel ratio:

```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Cap at 2x for performance/quality balance
```

## Performance Characteristics

- **GPU-bound**: Fluid simulation runs entirely on GPU
- **60 FPS target**: Uses `requestAnimationFrame` for smooth animation
- **Inactivity optimization**: Stops computation after 50ms of no movement
- **Texture size**: 500x500 fluid simulation, scaled images for display
- **Memory efficient**: Proper cleanup of Three.js resources on unmount

## Browser Compatibility

- Modern browsers with WebGL support
- Tested on Chrome, Firefox, Safari, Edge
- Mobile support via touch events
- Requires ES6+ JavaScript support

## Development

### Key Files to Modify

1. **App.jsx** - Main logic, uniforms, event handlers
2. **shaders.js** - GLSL shaders for fluid and display
3. **App.css** - UI styling and layout
4. **public/** - Replace images here

### Debugging Tips

Check browser console for:
- Image loading errors
- Texture size warnings
- WebGL context issues

Use Three.js devtools for:
- Scene inspection
- Texture preview
- Performance monitoring

### Common Modifications

**Change fluid color:**
```javascript
// In displayFragmentShader (shaders.js)
gl_FragColor = mix(bottomColor, topColor * vec4(1.0, 0.5, 0.5, 1.0), mask);
```

**Add multiple images:**
- Load additional textures in `App.jsx`
- Modify `displayFragmentShader` to blend 3+ images
- Update uniforms with new textures

**Adjust inactivity timeout:**
```javascript
// In App.jsx animate()
if (performance.now() - lastMoveTime > 100) {  // Change from 50ms
    isMoving = false;
}
```

## Technical Deep Dive

### Shader Pipeline

```
User Input (Mouse/Touch)
    ↓
Mouse Position Normalized (0-1 UV space)
    ↓
fluidFragmentShader
    ├─ Read previous frame from Ping-Pong Target A
    ├─ Apply 0.97 decay to fade trails
    ├─ Calculate distance to mouse path
    ├─ Add new brush stroke with smoothstep
    └─ Output to Ping-Pong Target B
    ↓
Swap targets (A ↔ B)
    ↓
displayFragmentShader
    ├─ Read fluid texture (red channel)
    ├─ Load top and bottom images
    ├─ Apply aspect-ratio-preserving UV mapping
    ├─ Blend images based on fluid threshold
    └─ Output to screen
```

### Memory Management

The app implements proper cleanup:

```javascript
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
```

This prevents memory leaks when component unmounts.

### Coordinate Systems

**Screen Space** → **Normalized UV** → **Texture Space**

```javascript
// Screen: (0,0) at top-left, (width, height) at bottom-right
const screenX = event.clientX;
const screenY = event.clientY;

// UV: (0,0) at bottom-left, (1,1) at top-right (WebGL convention)
const uvX = screenX / canvasWidth;
const uvY = 1 - (screenY / canvasHeight);  // Flip Y axis

// Texture: Apply aspect ratio correction via getCoverUV()
```

## License

MIT License - Feel free to use and modify for your projects.

## Credits

Built with React, Three.js, and modern WebGL techniques.

Portfolio 2025 - Elbaf Arc

---

**Happy coding!** For questions or issues, check the browser console for debugging information.

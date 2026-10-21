<div align="center">

# 🧠 GestureBoard (VisualNote)

**Spatial gesture-controlled infinite canvas for visual thinking & node mapping powered by real-time in-browser computer vision.**

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![MediaPipe](https://img.shields.io/badge/Google-MediaPipe%20Hands-009688?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Canvas](https://img.shields.io/badge/Engine-HTML5%20Canvas%20(60FPS)-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![Status](https://img.shields.io/badge/Status-Completed%20Showcase-success?style=for-the-badge)](https://github.com/Nekono3/VisualNote)

</div>

---

## 📌 Overview

**GestureBoard** is an AI-powered visual workspace inspired by Miro and Figma &mdash; but controlled entirely through **contactless hand gestures** captured in real-time from your standard webcam.

By tracking 21 3D hand landmarks per hand with sub-millimeter precision directly in the browser, GestureBoard allows users to select, drag, connect, pan, and zoom spatial visual cards without ever touching a physical mouse or keyboard.

---

## 🏗 Pipeline Architecture & Processing Loop

The system operates on an isolated 60 FPS `requestAnimationFrame` render pipeline decoupled from UI state:

```mermaid
flowchart TD
    subgraph Capture["1. Optical Capture"]
        Webcam[Webcam Video Stream] --> FrameGrab[camera/camera.js]
    end

    subgraph Perception["2. Vision & Landmark Extraction"]
        FrameGrab --> MP[MediaPipe Hand Landmarker]
        MP --> Landmarks[21 3D Spatial Landmarks per Hand]
        Landmarks --> Smoother[EMA Landmark Smoothing Filter]
    end

    subgraph GestureEngine["3. Gesture Classification & State"]
        Smoother --> DistCalc[Euclidean Distance & Vector Engine]
        DistCalc --> GestDetect{Gesture Recognizer}
        GestDetect -->|Thumb-Index Euclidean < Threshold| Pinch[Pinch: Select / Drag Node]
        GestDetect -->|Dual-Hand Distance Delta| ZoomPan[Two-Hand: Zoom & Pan Canvas]
        GestDetect -->|Hover Index Tip| Point[Cursor Raycast]
    end

    subgraph CanvasSpace["4. Infinite Canvas & Spatial Engine"]
        Pinch --> Trans[World-to-Screen Matrix Transform]
        ZoomPan --> Trans
        Trans --> WS[workspace/workspace.js: Graph & Notes]
        WS --> Linker[Dynamic Quadratic Bezier Connectors]
        Linker --> Render[render/render.js: 60 FPS Canvas]
    end

    subgraph Output["5. Clean Export Pipeline"]
        Render --> Exporter[export/export.js: Isolated PNG Renderer]
        Exporter --> CleanPNG[Presentation-Ready PNG (No UI / No Landmarks)]
    end
```

---

## 🖐 Spatial Gesture Control Matrix

| Gesture | Landmark Trigger | Interaction Behavior |
| :--- | :--- | :--- |
| **Hover Pointer** | Index Fingertip (`Landmark #8`) | Casts raycast cursor across world canvas coordinates |
| **Pinch Select / Drag** | Euclidean distance `d(#4 Thumb, #8 Index) < 35px` | Grabs targeted card; moves node across 2D plane |
| **Node Connection** | Pinch on connector anchor $ightarrow$ Drag to Target | Creates dynamic bidirectional link between cards |
| **Two-Hand Zoom** | Distance delta between Left & Right Wrist/Index | Expands / compresses canvas zoom scale matrix |
| **Two-Hand Pan** | Simultaneous centroid vector translation of both hands | Shifts viewport world offsets $(X, Y)$ smoothly |
| **Double Tap** | Rapid successive pinch cycles | Spawns a new sticky note card at cursor coordinate |

---

## 🚀 Key Technical Innovations

### 1. Zero-Jitter Exponential Moving Average (EMA)
Raw optical landmarks suffer from micro-tremors. GestureBoard implements dynamic smoothing filters that damp high-frequency jitter during stationary holding while maintaining zero input latency during fast arm movements.

### 2. High-Performance Decoupled Canvas Pipeline
Unlike standard DOM-heavy React visual boards that degrade with card counts, GestureBoard renders all nodes, text layouts, and Bezier connector curves onto an optimized **HTML5 2D Canvas context** using viewport culling and spatial coordinate hashing.

### 3. Isolated Clean Export Engine
The export subsystem renders the node graph into an off-screen virtual canvas context, dynamically computing bounding boxes and exporting clean, crisp, high-resolution PNGs with zero UI clutter or camera landmarks.

---

## 💻 Tech Stack

- **Computer Vision:** Google MediaPipe Hand Landmarker (WebAssembly / GPU accelerated)
- **Frontend Core:** Vanilla JavaScript (ES6+ Modules), HTML5 Canvas 2D
- **Math & Vectors:** Linear Algebra matrix transforms (World-to-Screen, Screen-to-World)
- **Local Server:** Node.js Express for instant local serving

---

## 📂 Repository File Structure

```plaintext
VisualNote/
├── index.html          # Main application canvas shell & overlay markup
├── style.css           # High-contrast UI controls & toolbar styling
├── server.js           # Lightweight static server
├── src/
│   ├── main.js         # Core application lifecycle & event loop
│   ├── camera/         # WebRTC webcam initialization & frame rate throttle
│   ├── vision/         # MediaPipe pipeline initialization & landmark extraction
│   ├── gesture/        # State machine, pinch detection, and dual-hand geometry
│   ├── workspace/      # Graph data structures (nodes, links, spatial bounds)
│   ├── render/         # 60 FPS Canvas draw calls, text rendering & Bezier links
│   ├── ui/             # Virtual toolbar, color pickers, and mode switches
│   └── export/         # Off-screen canvas rendering & lossless PNG export
└── README.md           # Documentation
```

---

## ⚡ Quickstart & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/Nekono3/VisualNote.git
cd VisualNote
```

### 2. Start the local server
```bash
# Using Node.js
node server.js

# Or using Python 3
python3 -m http.server 8080
```

### 3. Open in Browser
Visit `http://localhost:8080` (or the port specified by `server.js`). Grant webcam access when prompted by the browser.

---

## 👨‍💻 Author

- **Belek Tazhibaev (Blake)** &mdash; Frontend & Computer Vision Developer
- **GitHub:** [@Nekono3](https://github.com/Nekono3)
- **Telegram:** [@Chromatic_s](https://t.me/Chromatic_s)
- **Email:** [tazhibaev0909@gmail.com](mailto:tazhibaev0909@gmail.com)

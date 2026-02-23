# 🧠 GestureBoard

A gesture-controlled visual workspace built for the browser.

Create, move, link, and organize floating notes using real-time hand tracking — directly from your webcam.

Built by **Nekono3 (Belek)**

---

## 🚀 Overview

GestureBoard is a visual thinking tool inspired by Figma and Miro — but controlled using hand gestures.

It allows users to:

- ✋ Move notes using hand tracking
- 🤏 Pinch to select
- 🖐🖐 Use two hands to zoom and pan
- 🔗 Link notes visually
- 📝 Edit note text
- 💾 Export notes cleanly

The system runs entirely in the browser.

---

## 🎯 Features

### 🗂 Visual Notes
- Create floating notes
- Delete notes
- Drag and reposition notes
- Multi-selection support
- Editable text inside notes

### 🔗 Linking System
- Connect notes with dynamic lines
- Links update automatically when notes move
- Remove links anytime

### 🔍 Zoom & Pan (Two-Hand Support)
- Two-hand pinch to zoom in/out
- Two-hand movement to pan workspace
- Smooth infinite canvas navigation

### 🖐 Gesture Interaction
- Index finger acts as virtual cursor
- Pinch gesture = click/select
- Two-hand gestures for navigation
- Real-time 21-point hand landmark detection

---

## 💾 Export System

GestureBoard exports **only the notes** — clean and presentation-ready.

### 📸 Export as PNG

When clicking **Download → Export as PNG**:

- White background
- Only notes rendered
- No camera feed
- No toolbar
- No hand landmarks
- No UI overlays
- Automatically cropped to fit notes

This ensures a clean and professional export.

---

## 🏗 Architecture

Camera Layer  
↓  
Vision Layer (Multi-Hand Tracking)  
↓  
Gesture Engine  
↓  
Workspace Engine  
↓  
Canvas Render Engine  
↓  
HTML Editor Overlay (for typing)  
↓  
Export Manager  

---

## 🧩 Data Model

### Note Structure

```js
{
  id: string,
  x: number,        // world coordinate
  y: number,
  width: number,
  height: number,
  text: string
}
```

### Link Structure

```js
{
  id: string,
  from: noteId,
  to: noteId
}
```

### Workspace State

```js
{
  zoom: number,
  offsetX: number,
  offsetY: number
}
```

---

## ⚡ Performance Principles

- 60 FPS rendering loop
- requestAnimationFrame-based updates
- No React re-render per frame
- World-to-screen coordinate transformation
- Landmark smoothing to reduce jitter
- Modular gesture state machine

---

## 🛠 Tech Stack

- React + Vite
- MediaPipe (Hand Tracking)
- HTML5 Canvas
- Gesture Classification Engine
- Blob-based PNG export

---

## 🧪 Roadmap

- [ ] Cloud save
- [ ] Import project files
- [ ] Real-time collaboration
- [ ] AI auto-link suggestions
- [ ] Multi-board system
- [ ] Touchscreen fallback mode

---

## 👤 Author

**Nekono3 (Belek)**  
Frontend Developer  
Gesture Interaction & Visual Systems Enthusiast  

---

## 📜 License

MIT License

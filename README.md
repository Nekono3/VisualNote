🧠 GestureBoard

A gesture-controlled visual workspace built for the browser.
Create, link, move, and organize visual notes using hand tracking and real-time gestures.

Built by Nekono3 (Belek)

🚀 Overview

GestureBoard is a next-generation visual thinking tool inspired by Figma and Miro — but controlled with your hands.

Using your webcam and real-time hand tracking, you can:

✋ Move notes with gestures

🤏 Pinch to select

🖐🖐 Use two hands to zoom and pan

🔗 Link ideas visually

📝 Edit note text

💾 Export your workspace

No installation required. Runs directly in the browser.

🎯 Features
🗂 Visual Notes

Create and delete floating notes

Drag and reposition notes

Multi-selection support

Editable text inside notes

🔗 Linking System

Connect notes visually

Dynamic links update when notes move

Remove links anytime

🔍 Zoom & Pan (Two-Hand Support)

Two-hand pinch to zoom in/out

Two-hand movement to pan workspace

Infinite or large virtual canvas

Smooth transformation math

🖐 Gesture Interaction

Index finger acts as cursor

Pinch gesture = click/select

Two-hand gestures for navigation

Real-time landmark visualization (21 hand points)

💾 Export System

Save Project as .json

Export workspace as .png

Versioned workspace state

Timestamped file names

🏗 Architecture

The system is modular and performance-focused.

Camera Layer
   ↓
Vision Layer (Multi-Hand Tracking)
   ↓
Gesture Engine
   ↓
Workspace Engine
   ↓
Render Engine (Canvas)
   ↓
HTML Editor Overlay (for text editing)
   ↓
Export Manager
🧩 Data Model
Notes
{
  id: string,
  x: number,        // world coordinates
  y: number,
  width: number,
  height: number,
  text: string
}
Links
{
  id: string,
  from: noteId,
  to: noteId
}
Workspace State
{
  zoom: number,
  offsetX: number,
  offsetY: number
}
⚡ Performance Principles

60 FPS rendering loop

requestAnimationFrame driven

No React re-render per frame

World-to-screen transformation math

Gesture state machine

Landmark smoothing to reduce jitter

🧠 Core Concepts

World coordinate system

Transform matrix for zoom/pan

Gesture classification engine

Modular export system

Mode separation (Navigation vs Editing)

🛠 Tech Stack

React + Vite

MediaPipe (Hand Tracking)

HTML5 Canvas

Gesture Classification Logic

Blob-based file export system

📦 Export Formats
JSON (Primary Format)

Full workspace state

Notes

Links

Zoom & pan state

Versioned structure

PNG

Visible viewport export

Optional full workspace export

🧪 Roadmap

 Cloud Save

 Real-time collaboration (WebSocket)

 AI auto-linking suggestions

 Workspace rotation

 Multi-board system

 Touchscreen support

🎥 How It Works

Webcam initializes

Hand landmarks detected (21 points per hand)

Gesture engine interprets actions

Workspace engine updates state

Canvas renders notes and links

HTML overlay activates when editing

💡 Use Cases

Mind mapping

Startup planning

Education

Visual brainstorming

Touchless presentations

Accessibility tools

📜 License

MIT License

👤 Author

Nekono3 (Belek)
Frontend Developer
Gesture Interaction & Web Systems Enthusiast

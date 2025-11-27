# Resonote

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Google Gemini](https://img.shields.io/badge/google%20gemini-%238E75B2.svg?style=for-the-badge&logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Resonote** is a next-generation Optical Music Recognition (OMR) platform designed to bridge the gap between static sheet music and digital interactivity. Leveraging the multimodal vision capabilities of Google's Gemini 3 Pro and Gemini 2.5 models, Resonote analyzes complex musical scores and converts them into semantically valid ABC notation in real-time.

[**View Live Deployment**](https://resonoteai.vercel.app/)

---

## Overview

Traditional OMR software often struggles with handwritten scores, complex polyphony, and lyric alignment. Resonote addresses these challenges by utilizing Large Multimodal Models (LMMs) to "reason" about the visual structure of music rather than relying solely on heuristic pixel-matching algorithms. The system generates high-fidelity ABC notation that preserves:

*   Key and Time Signatures
*   Multi-voice arrangements (polyphony)
*   Lyric syllabification and alignment
*   Dynamics and articulation markings

The application features a fully integrated development environment (IDE) for music, allowing users to scan, edit, listen to, and export their scores instantly.

## Features

*   **AI-Powered Transcription**: Utilizes Gemini 3 Pro Vision to digitize images (PNG, JPG, SVG) into editable text.
*   **Syntax Validation Agent**: Implements a self-correcting loop where the AI validates its own generated ABC code against the `abcjs` parser to ensure syntactical correctness before outputting the result.
*   **Real-time Rendering**: Instant visual feedback using vector-based music engraving.
*   **In-Browser Synthesis**: High-performance audio playback with tempo control, looping, and instrument selection.
*   **Professional UI**: A flat, high-contrast Material You design interface optimized for dark mode and accessibility.
*   **Feedback Integration**: Automated GitHub Issue generation for efficient bug tracking and feature requests.

## Technology Stack

### Core Framework
*   **React 19**: Utilizing the latest concurrent features for optimal UI performance.
*   **TypeScript**: Statically typed codebase for robustness and maintainability.
*   **Vite**: Next-generation frontend tooling.

### Artificial Intelligence
*   **Google GenAI SDK**: Direct integration with Gemini 1.5 Pro, Gemini 2.5 Flash, and Gemini 3 Pro Preview.
*   **Chain-of-Thought Prompting**: specialized system instructions to force analytical reasoning before code generation.

### Music Engine
*   **abcjs**: Industry-standard library for parsing and rendering ABC notation in the browser.

### Styling
*   **Tailwind CSS**: Utility-first CSS framework.
*   **Material Symbols**: Google's variable font icon set.

## Architecture

1.  **Input**: User uploads an image via the `UploadZone` component.
2.  **Preprocessing**: Image is converted to Base64 and optimized for token usage.
3.  **Inference**:
    *   The client establishes a session with the Google Gemini API.
    *   A multimodal prompt containing the image and specific OMR constraints is sent.
    *   The model employs a "Thinking" process to analyze the score structure.
4.  **Validation Loop**:
    *   The model generates a candidate ABC string.
    *   The system executes a tool call (`validate_abc_notation`) to check for syntax errors.
    *   If errors exist, the model self-corrects based on the error log.
5.  **Rendering**: The final validated string is streamed to the `Editor` and rendered by the `MusicDisplay` component.

## Installation & Setup

To run this project locally, ensure you have Node.js (v18+) installed.

### 1. Clone the repository
```bash
git clone https://github.com/IRedDragonICY/resonote.git
cd resonote
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory. You must obtain an API key from Google AI Studio.

```env
API_KEY=your_google_ai_studio_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Contributing

Contributions are welcome. Please strictly adhere to the following guidelines:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Please ensure all new code is typed correctly and passes the existing linting rules.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

*   **Author**: IRedDragonICY (Mohammad Farid Hendianto)
*   **Engine**: Powered by Google Gemini

// src/App.jsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, useProgress, Html } from '@react-three/drei';
import { Model as CatModel } from './cat'; // Import your cat model component
import './App.css'; // Optional: for styling the canvas container

// A simple loader component
function Loader() {
  const { progress } = useProgress();
  return <Html center>{Math.round(progress)} % loaded</Html>;
}

function App() {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{
          position: [80, 40, 55], // MOVED CAMERA FURTHER BACK (Z-axis from 5 to 10), and slightly higher
          fov: 50,                // INCREASED FOV (from 50 to 60)
          near: 0.1,              // Default is 0.1, good to be explicit
          far: 1000               // Default is 2000, ensure it's large enough for your scene
        }}
        shadows // Enable shadows for the scene if your lights/meshes cast them
      >
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.8} /> {/* Slightly increased ambient light */}
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={1024} // Optional: improve shadow quality
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />

          {/* Your Cat Model */}
          <CatModel
            position={[0, -0.8, 0]} // Keep Y position for now
            scale={1.0}             // REDUCED SCALE (from 1.5 to 1.0) - try even smaller if needed (e.g., 0.5)
             rotation={[0, Math.PI / 2, 0]} // Keep or adjust rotation as needed
          />

          <Environment preset="city" />

          {/* Optional: A simple ground plane for reference */}
          {/*
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.81, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} /> // Made plane larger
            <meshStandardMaterial color="gray" />
          </mesh>
          */}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;

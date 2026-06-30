import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Float, Sparkles } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/hero.glb');
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <primitive object={scene} scale={3.5} position={[0, -2.2, 0]} />
      
      {/* Super Saiyan Aura Effect - sparkles only, no solid geometry */}
      <Sparkles count={300} scale={4} size={6} speed={2} opacity={0.6} color="#ffcc00" position={[0, 0, 0]} />
      <Sparkles count={100} scale={3} size={10} speed={3} opacity={0.8} color="#ffffff" position={[0, -1, 0]} />
      <pointLight position={[0, 1, 0]} intensity={8} color="#ffaa00" distance={5} />
      <pointLight position={[0, -1, 0]} intensity={4} color="#ffcc00" distance={3} />
    </Float>
  );
}

export function HeroModel() {
  return (
    <div style={{ width: '100%', height: '500px', position: 'relative', pointerEvents: 'auto' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}

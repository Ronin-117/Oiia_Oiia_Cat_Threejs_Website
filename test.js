import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.onload = () => loadModel();

function loadModel() {
  const loader = new GLTFLoader();
  loader.load('public/test.glb', // Ensure this path is correct
    (gltf) => {
      setupScene(gltf);
      document.getElementById('avatar-loading').style.display = 'none';
    },
    (xhr) => {
      const percentCompletion = Math.round((xhr.loaded / xhr.total) * 100);
      document.getElementById('avatar-loading').innerText = `LOADING... ${percentCompletion}%`
      console.log(`Loading model... ${percentCompletion}%`);
    },
    (error) => {
      console.error("An error happened", error);
    }
  );
}

function setupScene(gltf) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const container = document.getElementById('avatar-container');
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Camera setup
  const camera = new THREE.PerspectiveCamera(
    45, container.clientWidth / container.clientHeight);
  camera.position.set(0, 1, 100);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minDistance = 3;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target = new THREE.Vector3(0, 0, 0);
  controls.update();

  // Scene setup
  const scene = new THREE.Scene();

  // Lighting setup
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const spotlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 4, 0.5, 1);
  spotlight.position.set(0, 50, 50);
  spotlight.castShadow = true;
  scene.add(spotlight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
  keyLight.position.set(1, 1, 2);
  keyLight.lookAt(new THREE.Vector3());
  scene.add(keyLight);

  // Load avatar
  const avatar = gltf.scene;
  avatar.position.x = 0; // Center the model
  avatar.position.y = 0; // Center the model
  scene.add(avatar);

  // Find the mesh with the shape key
  let targetMesh = null;
  avatar.traverse((child) => {
    if (child.isMesh && child.morphTargetInfluences && child.userData.targetNames) {
      if (child.userData.targetNames.includes("Key 1") && child.userData.name === "Cube") {
        targetMesh = child;
      }
    }
  });

  if (!targetMesh) {
    console.error("Mesh with 'Key 1' shape key and name 'Cube' not found.");
    return;
  }

  // Raycaster and mouse setup
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isHovering = false;

  container.addEventListener('mousemove', (event) => {
    mouse.x = (event.offsetX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / container.clientHeight) * 2 + 1;
    checkIntersection(); // Call checkIntersection on mousemove
  });
  container.addEventListener('mouseleave', () => {
    // Reset shape key when mouse leaves the container
    if (isHovering) {
      console.log("Mouse left the container");
      isHovering = false;
      if (targetMesh) {
        targetMesh.morphTargetInfluences[0] = 0; // Reset shape key to 0
      }
    }
  });

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(avatar.children, true); // Check intersection with children

    if (intersects.length > 0) {
      if (!isHovering) {
        console.log("Mouse entered the model");
        isHovering = true;
        if (targetMesh) {
          targetMesh.morphTargetInfluences[0] = 1; // Activate shape key (set to 1)
        }
      }
    } else {
      if (isHovering) {
        console.log("Mouse left the model");
        isHovering = false;
        if (targetMesh) {
          targetMesh.morphTargetInfluences[0] = 0; // Deactivate shape key (set to 0)
        }
      }
    }
  }

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  animate();
}

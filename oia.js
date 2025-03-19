import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

window.onload = () => loadModel();

function loadModel() {
  const loader = new GLTFLoader();
  loader.load('public/cat.glb', // Ensure this path is correct
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
  let targetMesh = null;
  avatar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.morphTargetInfluences && child.geometry.morphAttributes.position) {
        targetMesh = child;
        console.log("Found a mesh with morph targets:", targetMesh);
        // Log all morph target names for debugging
        console.log("Morph target names:", child.geometry.morphAttributes.position.map(attr => attr.name));
      }
    }
  });
  avatar.rotation.y = Math.PI;
  avatar.position.x = -25;
  avatar.position.y -= 10;
  scene.add(avatar);

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
      setShapeKeyInfluence(targetMesh, "target_0", 0);
    }
  });

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(avatar, true);

    if (intersects.length > 0) {
      if (!isHovering) {
        console.log("Mouse entered the model");
        isHovering = true;
        setShapeKeyInfluence(targetMesh, "target_0", 1);
      }
    } else {
      if (isHovering) {
        console.log("Mouse left the model");
        isHovering = false;
        setShapeKeyInfluence(targetMesh, "target_0", 0);
      }
    }
  }

  function setShapeKeyInfluence(mesh, targetName, value) {
    if (!mesh || !mesh.morphTargetInfluences) {
      console.warn("Mesh does not have morph targets or is undefined.");
      return;
    }

    const morphAttributes = mesh.geometry.morphAttributes;
    if (!morphAttributes || !morphAttributes.position) {
      console.warn("Mesh does not have morphAttributes.position.");
      return;
    }
    
    let targetIndex = -1;
    for (let i = 0; i < morphAttributes.position.length; i++) {
        if (morphAttributes.position[i].name === targetName) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex !== -1) {
      mesh.morphTargetInfluences[targetIndex] = value;
      console.log(`Shape key '${targetName}' set to ${value}`);
    } else {
      console.warn(`Shape key '${targetName}' not found.`);
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

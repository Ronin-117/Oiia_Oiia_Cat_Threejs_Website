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
  //avatar.rotation.y = Math.PI; // Remove this line
  avatar.position.x = 0; // Center the model
  avatar.position.y = 0; // Center the model
  scene.add(avatar);

  // Animation Mixer
  const mixer = new THREE.AnimationMixer(avatar);

  // --- Extract Morph Target Animation ---
  let target0Action = null;
  avatar.traverse((child) => {
    if (child.isMesh && child.morphTargetInfluences && child.userData.targetNames) {
      const targetNames = child.userData.targetNames;
      const targetIndex = targetNames.indexOf("target_0");

      if (targetIndex !== -1) {
        const morphTargetData = child.morphTargetDictionary;
        const targetName = Object.keys(morphTargetData).find(key => morphTargetData[key] === targetIndex);
        if (targetName) {
          const track = new THREE.NumberKeyframeTrack(
            `${child.name}.morphTargetInfluences[${targetIndex}]`,
            [0, 1], // Time values (start and end)
            [0, 1] // Influence values (0 to 1)
          );

          const clip = new THREE.AnimationClip("target_0", 2, [track]); // Duration of 2 seconds
          target0Action = mixer.clipAction(clip);
          target0Action.clampWhenFinished = true;
          target0Action.loop = THREE.LoopOnce;
        }
      }
    }
  });

  if (!target0Action) {
    console.warn("Morph target 'target_0' not found or could not be converted to animation.");
  }

  // Raycaster and mouse setup
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isHovering = false;
  let rotationSpeed = 0.5; // Adjust the rotation speed as needed
  let currentRotation = 0;
  let rotationDirection = 1; // 1 for clockwise, -1 for counterclockwise

  container.addEventListener('mousemove', (event) => {
    mouse.x = (event.offsetX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / container.clientHeight) * 2 + 1;
    checkIntersection(); // Call checkIntersection on mousemove
  });
  container.addEventListener('mouseleave', () => {
    // Reset animation when mouse leaves the container
    if (isHovering) {
      console.log("Mouse left the container");
      isHovering = false;
      if (target0Action) {
        target0Action.timeScale = -1; // Reverse the animation
        target0Action.play();
      }
      rotationDirection = 1; // Reset rotation direction
    }
  });

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(avatar, true);

    if (intersects.length > 0) {
      if (!isHovering) {
        console.log("Mouse entered the model");
        isHovering = true;
        if (target0Action) {
          target0Action.timeScale = 1; // Play the animation forward
          target0Action.reset().play();
        }
      }
       // Change rotation direction on hover
       rotationDirection = -rotationDirection;
    } else {
      if (isHovering) {
        console.log("Mouse left the model");
        isHovering = false;
        if (target0Action) {
          target0Action.timeScale = -1; // Reverse the animation
          target0Action.play();
        }
      }
    }
  }

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    mixer.update(clock.getDelta());

    // Rotate the avatar continuously while hovering
    if (isHovering) {
      const delta = clock.getDelta();
      currentRotation += rotationSpeed * delta * rotationDirection;
      avatar.rotation.z = currentRotation; // Rotate the avatar, not the child mesh
    }

    renderer.render(scene, camera);
  }

  animate();
}

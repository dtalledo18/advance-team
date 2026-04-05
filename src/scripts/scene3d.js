import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScene3D() {
    const container = document.getElementById('container-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';
    container.appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(0, 10, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.radius = 4;
    scene.add(mainLight);

    const blueLight = new THREE.PointLight(0x4455ff, 5, 20);
    blueLight.position.set(-8, 4, 2);
    scene.add(blueLight);

    const rimLight = new THREE.PointLight(0xffffff, 8, 20);
    rimLight.position.set(8, 4, -2);
    scene.add(rimLight);

    const frontLight = new THREE.PointLight(0xffffff, 0.2);
    frontLight.position.set(0, 0, 5);
    scene.add(frontLight);

    let model;
    const loader = new GLTFLoader();

    // Vistas para los 3 puntos
    const VIEWS = {
        default: { cam: { x: 3, y: 0, z: 10 }, rot: { y: -0.3 } },
        roof:    { cam: { x: 3, y: 5, z: 7  }, rot: { y: -0.2 } },
        door:    { cam: { x: 3, y: -1, z: 7 }, rot: { y: 0.1  } },
        aerial:  { cam: { x: 3, y: 10, z: 5 }, rot: { y: 0.3  } },
    };

    let currentView = 'default';

    window.__houseView = (viewName) => {
        const v = VIEWS[viewName] || VIEWS.default;
        currentView = viewName;
        gsap.to(camera.position, { ...v.cam, duration: 1.4, ease: 'power3.inOut' });
        if (model) gsap.to(model.rotation, { y: v.rot.y, duration: 1.4, ease: 'power3.inOut' });
    };
    window.__setHousePoint = (idx) => {};

    loader.load('/models/house.glb', (gltf) => {
        model = gltf.scene;
        scene.add(model);

        model.scale.set(0.5, 0.5, 0.5);

        // Casa desplazada a la DERECHA: X positivo desplaza a la derecha en cámara
        model.position.set(3, -2, 0);

        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    node.material.roughness = 0.1;
                    node.material.metalness = 0.2;
                }
            }
        });

        // Cámara inicial: desplazada a la derecha también para encuadrar la casa
        camera.position.set(3, 0, 10);
    });

    let mouseX = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (model && currentView === 'default') {
            const targetRot = -0.3 + (-mouseX * 0.15);
            model.rotation.y += (targetRot - model.rotation.y) * 0.05;
        }
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
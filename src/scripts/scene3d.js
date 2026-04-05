import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScene3D() {
    const container = document.getElementById('container-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';
    container.appendChild(renderer.domElement);

    // ── Luces ──────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 12, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xd6d6dd, 0.8);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffa501, 3, 30);
    rimLight.position.set(-8, 6, -3);
    scene.add(rimLight);

    // ── Estado de vistas ───────────────────────────────────────────────────
    // Vista default: plano leve picado — casa vista de frente ligeramente desde arriba
    // Punto 1 (techo): cámara sube, mira hacia abajo — se ve el tejado
    // Punto 2 (puerta): cámara baja y se acerca — nivel de la puerta
    // Punto 3 (cenital): cámara muy arriba, picado fuerte — vista aérea completa

    const VIEWS = {
        default: {
            cam:   { x: 3.5,  y: 2.5,  z: 11 },
            target:{ x: 0,    y: 0,    z: 0  },
            rot:   { y: -0.15 },   // casa levemente girada a la izq
        },
        roof: {
            cam:   { x: 2,    y: 7,    z: 6  },
            target:{ x: 0,    y: 2.5,  z: 0  },
            rot:   { y: -0.25 },
        },
        door: {
            cam:   { x: 0.5,  y: -1.2, z: 7  },
            target:{ x: 0,    y: -1.5, z: 0  },
            rot:   { y: 0.05 },
        },
        aerial: {
            cam:   { x: 0,    y: 14,   z: 5  },
            target:{ x: 0,    y: 0,    z: 0  },
            rot:   { y: 0.3 },
        },
    };

    let currentView = 'default';
    let activePoint = -1;   // -1 = ninguno activo
    let model;
    const camTarget = new THREE.Vector3(0, 0, 0);

    // ── Cargar modelo ──────────────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.load('/models/house.glb', (gltf) => {
        model = gltf.scene;
        scene.add(model);

        model.scale.set(0.5, 0.5, 0.5);
        model.position.set(0, -3.5, 0);

        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    node.material.roughness = 0.55;
                    node.material.metalness = 0.1;
                }
            }
        });

        // Posición inicial de cámara
        applyView('default', 0);
    });

    // ── Función para animar la cámara a una vista ──────────────────────────
    function applyView(viewName, duration = 1.4) {
        const v = VIEWS[viewName];
        currentView = viewName;

        gsap.to(camera.position, {
            x: v.cam.x, y: v.cam.y, z: v.cam.z,
            duration,
            ease: 'power3.inOut',
            onUpdate: () => {
                camera.lookAt(camTarget);
            }
        });

        gsap.to(camTarget, {
            x: v.target.x, y: v.target.y, z: v.target.z,
            duration,
            ease: 'power3.inOut',
        });

        if (model) {
            gsap.to(model.rotation, {
                y: v.rot.y,
                duration,
                ease: 'power3.inOut',
            });
        }
    }

    // ── Exponer función global para que los botones del hero la llamen ─────
    window.__houseView = applyView;

    // ── Interacción mouse — rotación suave SOLO en vista default ──────────
    let mouseX = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    });

    // ── Animate loop ───────────────────────────────────────────────────────
    function animate() {
        requestAnimationFrame(animate);

        if (model && currentView === 'default' && activePoint === -1) {
            const targetRot = VIEWS.default.rot.y + mouseX * 0.12;
            model.rotation.y += (targetRot - model.rotation.y) * 0.04;
        }

        camera.lookAt(camTarget);
        renderer.render(scene, camera);
    }
    animate();

    // ── Resize ────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ── Exponer setter de activePoint ──────────────────────────────────────
    window.__setHousePoint = (idx) => { activePoint = idx; };
}
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScene3D() {
    const container = document.getElementById('container-3d');
    if (!container) return;

    const scene = new THREE.Scene();

    // ── Cámara con FOV más estrecho para que la casa se vea más grande ──
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(0xffffff, 3, 30);
    rimLight.position.set(-5, 3, -3);
    scene.add(rimLight);

    let model;
    const loader = new GLTFLoader();

    // ── CLAVE: usamos un pivot group para controlar dónde apunta la cámara ──
    // La cámara siempre mira al pivot. El pivot está a la derecha.
    // Así la casa aparece en el lado derecho del viewport.
    const pivot = new THREE.Object3D();
    // Pivot en X positivo = la cámara mira hacia la derecha de la pantalla
    pivot.position.set(-4, 0, 0);
    scene.add(pivot);

    // Posición inicial de la cámara: frente al pivot, levemente picada
    camera.position.set(-4, 1.5, 8);
    camera.lookAt(pivot.position);

    // ── Vistas para los 3 puntos ──────────────────────────────────────────
    // Todas las cámaras apuntan al pivot (derecha) — la casa siempre queda ahí
    const VIEWS = {
        default: { cam: { x: -4,  y: 1.5, z: 8 }, pivotY: 0   },
        roof:    { cam: { x: -4,  y: 5,   z: 5 }, pivotY: 1.5 },
        door:    { cam: { x: -4,  y: 0,   z: 5 }, pivotY: -1  },
        aerial:  { cam: { x: -4,  y: 9,   z: 4 }, pivotY: 0   },
    };

    let currentView = 'default';

    window.__houseView = (viewName) => {
        const v = VIEWS[viewName] || VIEWS.default;
        currentView = viewName;
        gsap.to(camera.position, {
            x: v.cam.x, y: v.cam.y, z: v.cam.z,
            duration: 1.4, ease: 'power3.inOut'
        });
        gsap.to(pivot.position, {
            y: v.pivotY,
            duration: 1.4, ease: 'power3.inOut'
        });
    };
    window.__setHousePoint = () => {};

    loader.load('/models/v16.glb', (gltf) => {
        model = gltf.scene;

        model.scale.set(0.5, 0.5, 0.5);

        // ── Casa centrada en el pivot (derecha de la pantalla) ──
        // El pivot ya está en X=2, así que el modelo va en 0,0,0 local
        model.position.set(0, -2, 0);

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

        scene.add(model);
    });

    // ── Mouse: rota el modelo suavemente ─────────────────────────────────
    let mouseX = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    });

    function animate() {
        requestAnimationFrame(animate);

        if (model && currentView === 'default') {
            // Rotación Y alrededor del eje del modelo
            const targetRot = mouseX * 0.3;
            model.rotation.y += (targetRot - model.rotation.y) * 0.05;
        }

        // La cámara siempre apunta al pivot — esto es lo que mantiene la casa a la derecha
        camera.lookAt(pivot.position);

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
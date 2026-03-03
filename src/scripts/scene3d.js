import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScene3D() {
    const container = document.getElementById('container-3d');
    if (!container) return;

    // Escena y Cámara
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // RENDERER CON SOLUCIÓN DE Z-INDEX
    // --- 1. CONFIGURACIÓN DEL RENDERER PARA SOMBRAS ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ACTIVAR SHADOW MAPS
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves

    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';
    container.appendChild(renderer.domElement);


    // --- 2. CONFIGURACIÓN DE LUCES PARA SOMBRAS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Luz Principal (Cenital) - ESTA LUZ PROYECTARÁ LA SOMBRA
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(0, 10, 0);
    mainLight.castShadow = true;

    // Configuración fina de la sombra
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.radius = 4; // Suavizado extra

    scene.add(mainLight);

    // 3. Luces de Acento (Laterales)
    const blueLight = new THREE.PointLight(0x4455ff, 5, 20); // Subimos a 5
    blueLight.position.set(-8, 4, 2);
    scene.add(blueLight);

    const rimLight = new THREE.PointLight(0xffffff, 8, 20); // Subimos a 8
    rimLight.position.set(8, 4, -2); // La movemos un poco hacia atrás
    scene.add(rimLight);

    // 4. Luz Frontal (Sigue a la cámara)
    const frontLight = new THREE.PointLight(0xffffff, 0.2);
    frontLight.position.set(0, 0, 5);
    scene.add(frontLight);


    let model;
    const loader = new GLTFLoader();

    // Cargar la Chimenea
    loader.load('/models/warning-2.glb', (gltf) => {
        model = gltf.scene;
        scene.add(model);

        model.scale.set(2, 2, 2);
        // Posición inicial: la casa un poco baja para que se vea imponente
        model.position.set(0, -4.5, 0);

        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if(node.material) {
                    node.material.roughness = 0.1;
                    node.material.metalness = 0.2;
                }
            }
        });

        camera.position.set(0, 0, 10); // Posición inicial estándar

        // --- TIMELINE PARA EL ZOOM QUIRÚRGICO ---
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".scene-trigger",
                start: "top top",
                end: "bottom 10%",
                scrub: 1.5, // Un poco más de suavizado para la puntería
            }
        });

        tl.to(camera.position, {
            z: -10,      // Atraviesa el modelo hacia el fondo
            y: 6,    // BAJA en el eje Y para alinearse con el hueco
            x: 0,
            ease: "none" // Movimiento más natural al principio y final
        });
    });


    // Interacción Mouse
    let mouseX = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (model) {
            // Rotación suave invertida
            const targetRot = -mouseX * 0.5;
            model.rotation.y += (targetRot - model.rotation.y) * 0.05;
        }
        renderer.render(scene, camera);
    }
    animate();



    // Responsive
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
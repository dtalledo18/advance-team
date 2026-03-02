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
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true // Mantiene el fondo transparente
    });

    renderer.setClearColor(0x000000, 0); // Fondo totalmente transparente para WebGL
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // SOLUCIÓN: El 3D siempre dibuja sobre el resto de la página
    renderer.domElement.style.position = 'relative';
    renderer.domElement.style.zIndex = '1';

    container.appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(5, 10, 5);
    scene.add(spotLight);

    let model;
    const loader = new GLTFLoader();

    // Cargar la Chimenea
    loader.load('/models/chimney.glb', (gltf) => {
        model = gltf.scene;
        scene.add(model);

        // SOLUCIÓN: ESCALA AGRANDADA (Anterior: 1, 1, 1)
        // He subido la escala para que sea un 50% más grande y cubra el humo
        model.scale.set(1.5, 1.5, 1.5);

        // Ajuste fino de posición (bajamos un poco más por el aumento de escala)
        model.position.set(0, -2.3, 0);

        camera.position.z = 5;

        // Animación de entrada al scroll (suavizada)
        gsap.to(camera.position, {
            z: -1.2, // Atraviesa el modelo más despacio
            ease: "none",
            scrollTrigger: {
                trigger: ".scene-trigger",
                start: "top top",
                // CAMBIO AQUÍ: En lugar de "bottom top", usa un porcentaje o píxeles
                // "bottom 50%" hará que la animación termine a la mitad del scroll
                end: "bottom 80%",
                scrub: 1, // Un valor más bajo (ej. 0.5) lo hace sentir más reactivo
            }
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
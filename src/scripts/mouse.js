// mouse.js — fuente única de verdad para la posición del cursor
// Tanto smoke.js como trail.js importan de aquí para estar siempre sincronizados

export const mouse = {
    // Posición real en píxeles (para trail Canvas 2D)
    x: -1000,
    y: -1000,

    // Posición normalizada 0..1 con Y invertida (para smoke WebGL)
    nx: 0.5,
    ny: 0.5,

    // Velocidad de movimiento (0..1) — controla tamaño del smoke y grosor del trail
    speed: 0,

    // Hue actual del arcoíris (0..360) — compartido para que smoke y trail tengan el mismo color
    hue: 0,

    _prevNx: 0.5,
    _prevNy: 0.5,
};

export function initMouse() {
    window.addEventListener('mousemove', e => {
        mouse.x  = e.clientX;
        mouse.y  = e.clientY;
        mouse.nx = e.clientX / window.innerWidth;
        mouse.ny = 1.0 - (e.clientY / window.innerHeight); // Y invertida para WebGL
    });

    window.addEventListener('touchmove', e => {
        e.preventDefault();
        const t  = e.touches[0];
        mouse.x  = t.clientX;
        mouse.y  = t.clientY;
        mouse.nx = t.clientX / window.innerWidth;
        mouse.ny = 1.0 - (t.clientY / window.innerHeight);
    }, { passive: false });

    // Loop para calcular velocidad y avanzar el hue — corre UNA sola vez para todos
    let prevNx = 0.5, prevNy = 0.5;

    function tick() {
        const dx  = mouse.nx - prevNx;
        const dy  = mouse.ny - prevNy;
        const vel = Math.sqrt(dx * dx + dy * dy) * 120;

        mouse.speed += (vel  - mouse.speed) * 0.10;
        mouse.hue    = (mouse.hue + 1.4) % 360;   // avanza arcoíris ~84°/seg a 60fps

        prevNx = mouse.nx;
        prevNy = mouse.ny;

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
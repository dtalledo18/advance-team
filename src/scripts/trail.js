export function initTrail() {

    // ── Crear el canvas del trail ──────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.id = 'trail-canvas';
    canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 49;
  `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Estado del trail ───────────────────────────────────────────────────
    // Cada punto guarda: posición, hue del color, y timestamp para el fade
    const points   = [];          // array de { x, y, hue, age }
    const MAX_PTS  = 180;         // cuántos puntos vive la estela (largo)
    const LINE_W   = 18;          // grosor máximo en px
    let   hue      = 0;           // color actual en HSL (0-360)
    let   mouseX   = -1000;
    let   mouseY   = -1000;

    // Posición suavizada del mouse (para que la línea sea fluida, no dentada)
    let smoothX = -1000;
    let smoothY = -1000;

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // ── Loop de animación ──────────────────────────────────────────────────
    function render() {
        // Suavizado del mouse — ease exponencial
        smoothX += (mouseX - smoothX) * 0.18;
        smoothY += (mouseY - smoothY) * 0.18;

        // Agregar punto nuevo
        hue = (hue + 1.2) % 360;   // avanza el color arcoíris
        points.push({ x: smoothX, y: smoothY, hue });

        // Limitar largo de la estela
        if (points.length > MAX_PTS) points.shift();

        // Limpiar canvas completamente cada frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dibujar la estela segmento a segmento
        // Cada segmento es más transparente y delgado cuanto más viejo (al inicio del array)
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];

            // progreso: 0 = cola (viejo/transparente), 1 = punta (nuevo/opaco)
            const progress = i / points.length;

            // Opacidad: la cola es casi invisible, la punta es brillante
            const alpha = Math.pow(progress, 1.8) * 0.9;

            // Grosor: la cola es fina, la punta es gruesa
            const width = progress * LINE_W;

            // Color arcoíris con glow — interpolamos el hue entre puntos vecinos
            const h = prev.hue;

            // ── Capa 1: glow exterior difuso (blur simulado con línea más ancha y transparente)
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = `hsla(${h}, 100%, 65%, ${alpha * 0.25})`;
            ctx.lineWidth   = width * 3.5;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.stroke();

            // ── Capa 2: glow medio
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = `hsla(${h}, 100%, 70%, ${alpha * 0.45})`;
            ctx.lineWidth   = width * 1.8;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.stroke();

            // ── Capa 3: núcleo brillante (línea fina y opaca en el centro)
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.strokeStyle = `hsla(${h}, 100%, 90%, ${alpha * 0.85})`;
            ctx.lineWidth   = width * 0.4;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.stroke();
        }

        // Punto de destello en la punta del cursor
        if (points.length > 0) {
            const tip = points[points.length - 1];

            // Glow circular en la punta
            const grd = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 28);
            grd.addColorStop(0,   `hsla(${tip.hue}, 100%, 95%, 0.6)`);
            grd.addColorStop(0.4, `hsla(${tip.hue}, 100%, 70%, 0.25)`);
            grd.addColorStop(1,   `hsla(${tip.hue}, 100%, 60%, 0)`);

            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 28, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}
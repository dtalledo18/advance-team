export function initCursor() {
    const el = document.getElementById('cursor');
    let tx = 0, ty = 0, cx = 0, cy = 0;

    window.addEventListener('mousemove', e => {
        tx = e.clientX;
        ty = e.clientY;
    });

    (function loop() {
        cx += (tx - cx) * 0.14;
        cy += (ty - cy) * 0.14;
        el.style.left = cx + 'px';
        el.style.top  = cy + 'px';
        requestAnimationFrame(loop);
    })();

    document.querySelectorAll('a, button, .service-inner').forEach(node => {
        node.addEventListener('mouseenter', () => el.classList.add('hovering'));
        node.addEventListener('mouseleave', () => el.classList.remove('hovering'));
    });
}
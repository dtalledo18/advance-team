import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

export function initLenis() {
    const lenis = new Lenis({
        duration: 0.5,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
    });

    // Esto asegura que Lenis también crea que está en el top
    lenis.scrollTo(0, { immediate: true });

    gsap.ticker.add(time => {
        lenis.raf(time * 1000);
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);

    return lenis;
}
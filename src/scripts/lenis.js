import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initLenis() {
    const lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
    });

    // Un solo loop compartido con GSAP — mejor performance
    gsap.ticker.add(time => {
        lenis.raf(time * 1000);
    });

    // Sincroniza ScrollTrigger con el scroll de Lenis
    lenis.on('scroll', ScrollTrigger.update);

    // Desactiva el lag smoothing de GSAP para que no haya doble suavizado
    gsap.ticker.lagSmoothing(0);

    return lenis;
}
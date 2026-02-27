import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initPreloader() {
    const preloader = document.getElementById('preloader');
    const preLogo   = preloader.querySelector('.pre-logo');
    const preBar    = document.getElementById('pre-bar');
    const preCount  = document.getElementById('pre-count');

    gsap.to(preLogo, { opacity: 1, duration: .7, ease: 'power3.out', delay: .1 });

    let prog = 0;
    const tick = setInterval(() => {
        prog += Math.random() * 14;
        if (prog >= 100) {
            prog = 100;
            clearInterval(tick);
            launchPage();
        }
        preBar.style.width    = prog + '%';
        preCount.textContent  = Math.floor(prog) + '%';
    }, 70);

    function launchPage() {
        gsap.to(preloader, {
            yPercent: -100,
            duration: 1.0,
            ease: 'power4.inOut',
            delay: 0.25,
            onComplete: () => { preloader.style.display = 'none'; }
        });

        gsap.to('.hero-title .line span', {
            translateY: '0%',
            duration: 1.4,
            ease: 'power4.out',
            stagger: 0.1,
            delay: 0.55
        });

        gsap.to(['.hero-desc', '.scroll-hint'], {
            opacity: 1,
            y: 0,
            duration: 1.0,
            ease: 'power3.out',
            stagger: 0.12,
            delay: 1.1
        });
    }
}

export function initScrollAnimations() {
    // Palabras del about entran al hacer scroll
    gsap.to('#about-heading .word span', {
        translateY: '0%',
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.07,
        scrollTrigger: { trigger: '#about', start: 'top 75%' }
    });

    // Contadores animados
    document.querySelectorAll('.stat-num').forEach(el => {
        const target  = parseInt(el.dataset.count);
        let triggered = false;

        ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            onEnter: () => {
                if (triggered) return;
                triggered = true;
                gsap.to({ val: 0 }, {
                    val: target,
                    duration: 1.8,
                    ease: 'power2.out',
                    onUpdate: function () {
                        el.textContent = Math.round(this.targets()[0].val) + '+';
                    }
                });
            }
        });
    });

    // Servicios entran desde la izquierda
    gsap.from('.service-item', {
        x: -40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.services-list', start: 'top 80%' }
    });

    // Contact heading
    gsap.to('.contact-heading .line span', {
        translateY: '0%',
        duration: 1.4,
        ease: 'power4.out',
        stagger: 0.15,
        scrollTrigger: { trigger: '.contact', start: 'top 70%' }
    });

    gsap.to(['.contact-pre', '.contact-cta'], {
        opacity: 1,
        y: 0,
        duration: 1.0,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '.contact', start: 'top 70%' }
    });

    // Parallax en el título del hero
    gsap.to('.hero-title', {
        y: '-12%',
        ease: 'none',
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });
}
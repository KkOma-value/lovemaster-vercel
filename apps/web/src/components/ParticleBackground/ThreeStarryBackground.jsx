import React, { useEffect, useRef } from 'react';

const RomanticBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let hearts = [];
        let particles = [];
        let time = 0;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initElements();
        };

        // Draw heart shape
        const drawHeart = (ctx, x, y, size, color, opacity) => {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, y + size / 4);
            ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
            ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
            ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
            ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
            ctx.fill();
            ctx.restore();
        };

        // Initialize elements
        const initElements = () => {
            hearts = [];
            particles = [];

            // Floating hearts
            const heartCount = Math.floor((canvas.width * canvas.height) / 80000);
            for (let i = 0; i < heartCount; i++) {
                hearts.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 15 + 8,
                    speedY: Math.random() * 0.3 + 0.1,
                    speedX: (Math.random() - 0.5) * 0.2,
                    opacity: Math.random() * 0.15 + 0.05,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.01,
                    color: ['#C47B5A', '#DCA080', '#E8C4A0', '#C9A87C'][Math.floor(Math.random() * 4)]
                });
            }

            // Soft glowing particles
            const particleCount = Math.floor((canvas.width * canvas.height) / 5000);
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 1,
                    opacity: Math.random() * 0.4 + 0.1,
                    twinkleSpeed: Math.random() * 0.02 + 0.01,
                    twinklePhase: Math.random() * Math.PI * 2,
                    color: ['#E8C4A0', '#F5E9DF', '#FAF7F2', '#F0E8DC'][Math.floor(Math.random() * 4)]
                });
            }
        };

        // Draw gradient background
        const drawBackground = () => {
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#FFF1F2');
            gradient.addColorStop(0.5, '#FCE7F3');
            gradient.addColorStop(1, '#FDF4FF');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle aurora effect
            const auroraGradient = ctx.createRadialGradient(
                canvas.width * 0.3, canvas.height * 0.2, 0,
                canvas.width * 0.3, canvas.height * 0.2, canvas.width * 0.6
            );
            auroraGradient.addColorStop(0, 'rgba(232, 196, 160, 0.3)');
            auroraGradient.addColorStop(0.5, 'rgba(196, 123, 90, 0.1)');
            auroraGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = auroraGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Second aurora blob
            const aurora2 = ctx.createRadialGradient(
                canvas.width * 0.8, canvas.height * 0.7, 0,
                canvas.width * 0.8, canvas.height * 0.7, canvas.width * 0.5
            );
            aurora2.addColorStop(0, 'rgba(220, 160, 128, 0.25)');
            aurora2.addColorStop(0.5, 'rgba(196, 123, 90, 0.08)');
            aurora2.addColorStop(1, 'transparent');
            ctx.fillStyle = aurora2;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        // Draw particles
        const drawParticles = () => {
            particles.forEach(p => {
                const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.3 + 0.7;
                const opacity = p.opacity * twinkle;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = opacity;
                ctx.fill();
                ctx.globalAlpha = 1;
            });
        };

        // Draw and update hearts
        const drawHearts = () => {
            hearts.forEach(heart => {
                ctx.save();
                ctx.translate(heart.x, heart.y);
                ctx.rotate(heart.rotation);
                drawHeart(ctx, 0, 0, heart.size, heart.color, heart.opacity);
                ctx.restore();

                if (!prefersReducedMotion) {
                    // Update position
                    heart.y -= heart.speedY;
                    heart.x += heart.speedX;
                    heart.rotation += heart.rotationSpeed;

                    // Reset when off screen
                    if (heart.y < -heart.size * 2) {
                        heart.y = canvas.height + heart.size;
                        heart.x = Math.random() * canvas.width;
                    }
                    if (heart.x < -heart.size) heart.x = canvas.width + heart.size;
                    if (heart.x > canvas.width + heart.size) heart.x = -heart.size;
                }
            });
        };

        // Animation loop
        const animate = () => {
            time++;
            
            drawBackground();
            drawParticles();
            drawHearts();

            animationFrameId = requestAnimationFrame(animate);
        };

        resize();
        window.addEventListener('resize', resize);
        
        if (!prefersReducedMotion) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            // Draw static version for reduced motion
            drawBackground();
            drawParticles();
            drawHearts();
        }

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none'
            }}
            aria-hidden="true"
        />
    );
};

export default RomanticBackground;

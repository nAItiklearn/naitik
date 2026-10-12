/* ====================================================
   DESIGNS.JS — Hank-D-Tank 3D Cylinder Gallery
   Cylindrical slice-based 3D canvas gallery
   Displaying 7 posters with zero clipping / distortion
   ==================================================== */

(() => {
  const canvas = document.getElementById('cylinder-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const POSTERS = [
    {
      id: 1,
      num: '01',
      name: 'Dream More',
      category: 'Visual Art / 01',
      src: 'components/posters/poster1.jpg',
      aspect: 422 / 592
    },
    {
      id: 2,
      num: '02',
      name: 'Safar (सफ़र)',
      category: 'Exploration / 02',
      src: 'components/posters/poster2.jpg',
      aspect: 736 / 520
    },
    {
      id: 3,
      num: '03',
      name: 'Bismillah',
      category: 'Typography / 03',
      src: 'components/posters/poster3.jpg',
      aspect: 736 / 1041
    },
    {
      id: 4,
      num: '04',
      name: 'Metamorphosis',
      category: 'Digital Surreal / 04',
      src: 'components/posters/poster4.jpg',
      aspect: 736 / 1041
    },
    {
      id: 5,
      num: '05',
      name: 'Padlock',
      category: 'Concept Design / 05',
      src: 'components/posters/poster5.jpeg',
      aspect: 943 / 954
    },
    {
      id: 6,
      num: '06',
      name: 'Identity',
      category: 'Abstract Art / 06',
      src: 'components/posters/poster6.png',
      aspect: 1.0
    },
    {
      id: 7,
      num: '07',
      name: 'Platform',
      category: 'Cyber Space / 07',
      src: 'components/posters/poster7.png',
      aspect: 1.0
    }
  ];

  const slicesPerCard = 100;
  const gap = 0.16;
  const normalSpeed = 0.005;

  const ring = {
    angle: 0,
    speed: normalSpeed,
    tilt: -0.22,
  };

  /**
   * Creates an off-screen card canvas for a poster.
   * Uses aspect ratio "contain" inside the poster frame so that
   * NO PART of any poster is cropped, squashed, or cut off.
   */
  function createCard(poster) {
    const card = document.createElement('canvas');
    card.width = 1200;
    card.height = 1600;
    const cardCtx = card.getContext('2d');

    const renderCard = (img) => {
      // 1. Dark collectible card background
      const grad = cardCtx.createLinearGradient(0, 0, 0, 1600);
      grad.addColorStop(0, '#15151a');
      grad.addColorStop(1, '#0c0c0f');
      cardCtx.fillStyle = grad;
      cardCtx.fillRect(0, 0, 1200, 1600);

      // Card outer border
      cardCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      cardCtx.lineWidth = 6;
      cardCtx.strokeRect(6, 6, 1188, 1588);

      // Top corner index watermark
      cardCtx.font = '700 36px "Space Mono", monospace';
      cardCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      cardCtx.fillText(`${poster.num} / 07`, 1010, 85);

      // 2. Poster Display Area (x: 50, y: 50, w: 1100, h: 1280)
      const frameX = 50;
      const frameY = 50;
      const frameW = 1100;
      const frameH = 1280;

      // Inner frame backing
      cardCtx.fillStyle = '#0a0a0c';
      cardCtx.fillRect(frameX, frameY, frameW, frameH);
      cardCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      cardCtx.lineWidth = 2;
      cardCtx.strokeRect(frameX, frameY, frameW, frameH);

      if (img && img.naturalWidth && img.naturalHeight) {
        // Calculate fit-contain dimensions: 100% visible, zero cropping
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        const scale = Math.min((frameW - 20) / imgW, (frameH - 20) / imgH);
        const destW = Math.round(imgW * scale);
        const destH = Math.round(imgH * scale);
        const destX = Math.round(frameX + (frameW - destW) / 2);
        const destY = Math.round(frameY + (frameH - destH) / 2);

        // Soft drop-shadow behind poster
        cardCtx.save();
        cardCtx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        cardCtx.shadowBlur = 36;
        cardCtx.shadowOffsetX = 0;
        cardCtx.shadowOffsetY = 12;
        cardCtx.drawImage(img, destX, destY, destW, destH);
        cardCtx.restore();

        // Subtle frame around poster image
        cardCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        cardCtx.lineWidth = 2;
        cardCtx.strokeRect(destX, destY, destW, destH);
      }

      // 3. Card Typography
      // Title
      cardCtx.font = '700 66px "Montserrat", "Syne", sans-serif';
      cardCtx.fillStyle = '#ffffff';
      cardCtx.fillText(poster.name, 60, 1445);

      // Category / Role
      cardCtx.font = '600 36px "Space Mono", monospace';
      cardCtx.fillStyle = '#f40c3f';
      cardCtx.fillText(poster.category, 60, 1515);

      // Tap hint badge on right
      cardCtx.font = '500 28px "Inter", sans-serif';
      cardCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      cardCtx.fillText('VIEW POSTER ↗', 940, 1515);
    };

    // Initial placeholder draw
    renderCard(null);

    // Preload image & redraw when ready
    const photo = new Image();
    photo.src = poster.src;
    photo.onload = () => {
      renderCard(photo);
    };

    return card;
  }

  const cards = POSTERS.map(createCard);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }

  function pointOnRing(angle, radius) {
    const depth = Math.cos(angle);
    const scale = 1 + depth * 0.28;

    return {
      x: Math.sin(angle) * radius * scale,
      y: depth * radius * 0.22,
      scale: scale,
    };
  }

  function drawRing(side) {
    const radius = Math.min(canvas.width * 0.38, canvas.height * 0.52);
    const slotAngle = (Math.PI * 2) / cards.length;
    const cardAngle = slotAngle * (1 - gap);
    const sliceAngle = cardAngle / slicesPerCard;
    const cardHeight = radius * cardAngle * 1.34;

    cards.forEach((card, cardIndex) => {
      const sliceWidth = card.width / slicesPerCard;

      for (let slice = 0; slice < slicesPerCard; slice++) {
        const angle = ring.angle + cardIndex * slotAngle + slice * sliceAngle;
        const start = pointOnRing(angle, radius);
        const end = pointOnRing(angle + sliceAngle, radius);
        const height = cardHeight * start.scale;
        const top = start.y - height / 2;

        if (side === "front" && end.x > start.x) {
          ctx.drawImage(
            card,
            slice * sliceWidth, 0, sliceWidth, card.height,
            start.x, top, end.x - start.x + 1, height
          );
        }

        if (side === "back" && end.x < start.x) {
          // Dark sleek card backing in portfolio dark theme
          ctx.fillStyle = "#15151b";
          ctx.fillRect(end.x, top, start.x - end.x + 1, height);

          // Top/bottom edge rims
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          ctx.fillRect(end.x, top, start.x - end.x + 1, 2);
          ctx.fillRect(end.x, top + height - 2, start.x - end.x + 1, 2);
        }
      }
    });
  }

  window.addEventListener('resize', resize);
  resize();

  // ─── Animation Ticker ───
  let activeIndex = 0;
  const navLinks = document.querySelectorAll('.project-list a');

  function updateActivePoster() {
    const slotAngle = (Math.PI * 2) / cards.length;
    let closestIndex = 0;
    let maxDepth = -999;

    POSTERS.forEach((_, i) => {
      // The center angle of this card
      const cardCenterAngle = ring.angle + i * slotAngle + (slotAngle * (1 - gap)) / 2;
      const depth = Math.cos(cardCenterAngle);
      if (depth > maxDepth) {
        maxDepth = depth;
        closestIndex = i;
      }
    });

    if (closestIndex !== activeIndex) {
      activeIndex = closestIndex;
      navLinks.forEach((link, idx) => {
        link.classList.toggle('active', idx === activeIndex);
      });
    }
  }

  gsap.ticker.add(() => {
    ring.angle += ring.speed * gsap.ticker.deltaRatio();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.47);
    ctx.rotate(ring.tilt);
    drawRing("back");
    drawRing("front");
    ctx.restore();

    updateActivePoster();
  });

  // Entrance speed boost & tilt breathing loop
  gsap.from(ring, { speed: 0.08, duration: 2.8, ease: "power3.out" });
  gsap.to(ring, { tilt: -0.10, duration: 4.5, repeat: -1, yoyo: true, ease: "sine.inOut" });

  // ─── Interaction: Pointer & Dragging ───
  let isPointerDown = false;
  let startX = 0;
  let startY = 0;
  let hasDragged = false;
  let lastMoveTime = 0;
  let lastX = 0;

  canvas.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastMoveTime = Date.now();
    hasDragged = false;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;
    const deltaX = e.clientX - lastX;
    const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY);

    if (totalDist > 5) {
      hasDragged = true;
    }

    const spin = deltaX * 0.0035;
    ring.angle += spin;
    ring.speed = spin * 0.5;

    lastX = e.clientX;
    lastMoveTime = Date.now();
  });

  const onPointerUp = (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (hasDragged) {
      gsap.to(ring, {
        speed: normalSpeed,
        duration: 1.8,
        ease: "power2.out",
        overwrite: "auto",
      });
    } else {
      // Tap / Click without dragging opens the front poster in Lightbox
      openLightbox(activeIndex);
    }
  };

  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // ─── Observer / Horizontal Wheel support (without blocking page scroll) ───
  canvas.addEventListener('wheel', (e) => {
    // Only intercept horizontal wheel scrolls
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const spin = e.deltaX * 0.0018;
      gsap.fromTo(
        ring,
        { speed: spin },
        { speed: normalSpeed, duration: 1.5, ease: "power2.out", overwrite: "auto" }
      );
    }
  }, { passive: false });

  // ─── Rotate to Specific Card Function ───
  function rotateToCard(index) {
    const slotAngle = (Math.PI * 2) / cards.length;
    const cardHalf = (slotAngle * (1 - gap)) / 2;
    // Front position is angle mod 2PI == 0
    const targetAngle = -(index * slotAngle + cardHalf);

    // Find shortest angular distance from current ring.angle
    const currentAngle = ring.angle;
    const diff = ((targetAngle - currentAngle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

    gsap.to(ring, {
      angle: currentAngle + diff,
      speed: 0,
      duration: 1.2,
      ease: "power3.out",
      overwrite: "auto",
      onComplete: () => {
        ring.speed = normalSpeed;
      }
    });
  }

  // Next / Prev step helper
  function stepCard(dir) {
    const nextIdx = (activeIndex + dir + POSTERS.length) % POSTERS.length;
    rotateToCard(nextIdx);
  }

  // ─── Controls: Prev / Next Buttons ───
  const prevBtn = document.getElementById('cylinder-prev');
  const nextBtn = document.getElementById('cylinder-next');
  if (prevBtn) prevBtn.addEventListener('click', () => stepCard(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => stepCard(1));

  // ─── Project List Nav Click ───
  navLinks.forEach((link, idx) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      rotateToCard(idx);
    });
  });

  // ─── Lightbox Modal ───
  const lightbox = document.getElementById('poster-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxCat = document.getElementById('lightbox-cat');
  const lightboxClose = document.getElementById('lightbox-close');

  function openLightbox(index) {
    const poster = POSTERS[index];
    if (!poster || !lightbox || !lightboxImg) return;

    lightboxImg.src = poster.src;
    lightboxImg.alt = poster.name;
    if (lightboxTitle) lightboxTitle.textContent = poster.name;
    if (lightboxCat) lightboxCat.textContent = poster.category;

    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox?.classList.contains('is-open')) {
      closeLightbox();
    }
  });

  // Expose helper globally
  window.rotateCylinderTo = rotateToCard;
})();

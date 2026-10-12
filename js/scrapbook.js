/* ====================================================
   SCRAPBOOK.JS — Community Doodles & Guestbook
   Renders user-submitted & seed doodles in a grid
   Supports drawing, signatures, messages, & instant publishing
   No email required — just name & optional message
   ==================================================== */

(() => {
  const scrapbookGrid = document.getElementById('scrapbook-grid');
  const paginationEl = document.getElementById('scrapbook-pagination');
  const openModalBtn = document.getElementById('open-scrapbook-modal');
  const modal = document.getElementById('scrapbook-modal');
  const closeModalBtn = document.getElementById('close-scrapbook-modal');
  const cancelModalBtn = document.getElementById('cancel-scrapbook-modal');
  const modalBackdrop = document.getElementById('close-scrapbook-modal-backdrop');
  const submitDoodleBtn = document.getElementById('submit-scrapbook-doodle');

  const modalCanvas = document.getElementById('scrapbook-draw-canvas');
  const modalNameInput = document.getElementById('modal-input-name');
  const modalMsgInput = document.getElementById('modal-input-message');
  const modalNameError = document.getElementById('modal-name-error');

  const ITEMS_PER_PAGE = 9;
  let currentPage = 1;

  // ─── Storage Management (Real User Submissions Only) ───
  function getStoredDoodles() {
    try {
      const data = localStorage.getItem('naitik_scrapbook_doodles');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredDoodles(doodles) {
    try {
      localStorage.setItem('naitik_scrapbook_doodles', JSON.stringify(doodles));
    } catch (e) {}
  }

  function getAllDoodles() {
    return getStoredDoodles();
  }

  // ─── Render Scrapbook Grid ───
  function renderScrapbook() {
    if (!scrapbookGrid) return;

    const allDoodles = getAllDoodles();

    if (allDoodles.length === 0) {
      scrapbookGrid.innerHTML = `
        <div class="scrapbook-empty">
          <div class="scrapbook-empty__icon">🎨</div>
          <h3 class="scrapbook-empty__title">No doodles yet</h3>
          <p class="scrapbook-empty__sub">Be the first to draw something or leave a message!</p>
          <button class="scrapbook__sign-btn scrapbook__sign-btn--empty" id="empty-scrapbook-sign-btn">
            <span class="sign-btn__icon">✏️</span> Sign the scrapbook
          </button>
        </div>
      `;
      document.getElementById('empty-scrapbook-sign-btn')?.addEventListener('click', openModal);
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(allDoodles.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = allDoodles.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    scrapbookGrid.innerHTML = '';

    pageItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `scrapbook-card ${item.isDark ? 'scrapbook-card--dark' : ''} ${item.isNew ? 'scrapbook-card--new' : ''}`;
      card.tabIndex = 0;
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `Doodle by ${item.name}`);

      let messageHtml = '';
      if (item.message && item.message.trim().length > 0) {
        // Escape HTML to prevent injection
        const cleanMsg = item.message
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        messageHtml = `<div class="scrapbook-card__msg">"${cleanMsg}"</div>`;
      }

      const cleanName = (item.name || 'Anonymous')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      card.innerHTML = `
        <div class="scrapbook-card__frame">
          <img src="${item.image}" alt="Doodle by ${cleanName}" class="scrapbook-card__img" loading="lazy" />
        </div>
        ${messageHtml}
        <div class="scrapbook-card__footer">
          <span class="scrapbook-card__author">${cleanName}</span>
          <span class="scrapbook-card__date">${item.date || 'visitor'}</span>
        </div>
      `;

      // Click card to inspect in full resolution
      card.addEventListener('click', () => {
        openDoodleViewer(item);
      });

      scrapbookGrid.appendChild(card);
    });

    renderPagination(totalPages);
  }

  // ─── Render Pagination ───
  function renderPagination(totalPages) {
    if (!paginationEl) return;
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    paginationEl.innerHTML = '';

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderScrapbook();
        scrollToScrapbookHeader();
      }
    });
    paginationEl.appendChild(prevBtn);

    // Page Number Buttons
    for (let p = 1; p <= totalPages; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${p === currentPage ? 'active' : ''}`;
      pageBtn.textContent = p;
      pageBtn.addEventListener('click', () => {
        if (currentPage !== p) {
          currentPage = p;
          renderScrapbook();
          scrollToScrapbookHeader();
        }
      });
      paginationEl.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderScrapbook();
        scrollToScrapbookHeader();
      }
    });
    paginationEl.appendChild(nextBtn);
  }

  function scrollToScrapbookHeader() {
    const sec = document.getElementById('scrapbook');
    if (sec) {
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ─── Drawing Canvas in Modal ───
  let modalCtx = null;
  let isDrawingModal = false;
  let modalColor = '#111111';
  let modalSize = 4;
  let isEraser = false;
  let modalTheme = 'light';
  let lastModalX = 0;
  let lastModalY = 0;
  let modalStrokeHistory = [];
  let hasDrawnInModal = false;

  function initModalCanvas() {
    if (!modalCanvas) return;
    modalCtx = modalCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = modalCanvas.getBoundingClientRect();
    const w = rect.width || 380;
    const h = rect.height || 380;

    modalCanvas.width = w * dpr;
    modalCanvas.height = h * dpr;
    modalCtx.scale(dpr, dpr);

    clearCanvasToBackground();

    modalCtx.lineCap = 'round';
    modalCtx.lineJoin = 'round';
  }

  function clearCanvasToBackground() {
    if (!modalCtx) return;
    const rect = modalCanvas.getBoundingClientRect();
    const w = rect.width || 380;
    const h = rect.height || 380;
    modalCtx.save();
    modalCtx.setTransform(1, 0, 0, 1, 0, 0);
    modalCtx.fillStyle = modalTheme === 'light' ? '#ffffff' : '#07070a';
    modalCtx.fillRect(0, 0, modalCanvas.width, modalCanvas.height);
    modalCtx.restore();
    modalStrokeHistory = [];
    saveCanvasState();
  }

  function saveCanvasState() {
    if (!modalCtx) return;
    if (modalStrokeHistory.length > 20) modalStrokeHistory.shift();
    modalStrokeHistory.push(modalCanvas.toDataURL());
  }

  function undoLastStroke() {
    if (modalStrokeHistory.length > 1) {
      modalStrokeHistory.pop(); // Current
      const prevData = modalStrokeHistory[modalStrokeHistory.length - 1];
      const img = new Image();
      img.src = prevData;
      img.onload = () => {
        modalCtx.save();
        modalCtx.setTransform(1, 0, 0, 1, 0, 0);
        modalCtx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
        modalCtx.drawImage(img, 0, 0);
        modalCtx.restore();
      };
    } else {
      clearCanvasToBackground();
      hasDrawnInModal = false;
    }
  }

  function getModalPos(e) {
    const rect = modalCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startModalDraw(e) {
    isDrawingModal = true;
    const { x, y } = getModalPos(e);
    lastModalX = x;
    lastModalY = y;
  }

  function doModalDraw(e) {
    if (!isDrawingModal || !modalCtx) return;
    e.preventDefault();
    const { x, y } = getModalPos(e);

    modalCtx.strokeStyle = isEraser ? (modalTheme === 'light' ? '#ffffff' : '#07070a') : modalColor;
    modalCtx.lineWidth = isEraser ? modalSize * 3 : modalSize;

    modalCtx.beginPath();
    modalCtx.moveTo(lastModalX, lastModalY);
    modalCtx.lineTo(x, y);
    modalCtx.stroke();

    lastModalX = x;
    lastModalY = y;
    hasDrawnInModal = true;
  }

  function stopModalDraw() {
    if (isDrawingModal) {
      isDrawingModal = false;
      saveCanvasState();
    }
  }

  if (modalCanvas) {
    modalCanvas.addEventListener('mousedown', startModalDraw);
    modalCanvas.addEventListener('mousemove', doModalDraw);
    modalCanvas.addEventListener('mouseup', stopModalDraw);
    modalCanvas.addEventListener('mouseleave', stopModalDraw);

    modalCanvas.addEventListener('touchstart', startModalDraw, { passive: false });
    modalCanvas.addEventListener('touchmove', doModalDraw, { passive: false });
    modalCanvas.addEventListener('touchend', stopModalDraw);
  }

  // Theme toggle: Light paper vs Dark board
  document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelector('.theme-toggle-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      modalTheme = btn.dataset.bg;
      if (modalTheme === 'dark') {
        modalCanvas.classList.add('theme-dark');
        if (modalColor === '#111111') {
          modalColor = '#ffffff';
          document.querySelectorAll('.m-color-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('.m-color-btn[data-color="#ffffff"]')?.classList.add('active');
        }
      } else {
        modalCanvas.classList.remove('theme-dark');
        if (modalColor === '#ffffff') {
          modalColor = '#111111';
          document.querySelectorAll('.m-color-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('.m-color-btn[data-color="#111111"]')?.classList.add('active');
        }
      }
      clearCanvasToBackground();
      hasDrawnInModal = false;
    });
  });

  // Color selection
  document.querySelectorAll('.m-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelector('.m-color-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      const val = btn.dataset.color;
      if (val === 'eraser') {
        isEraser = true;
      } else {
        isEraser = false;
        modalColor = val;
      }
    });
  });

  // Brush size selection
  document.querySelectorAll('.m-size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelector('.m-size-btn.active')?.classList.remove('active');
      btn.classList.add('active');
      modalSize = parseInt(btn.dataset.size, 10);
    });
  });

  // Undo & Clear buttons
  document.getElementById('modal-canvas-undo')?.addEventListener('click', undoLastStroke);
  document.getElementById('modal-canvas-clear')?.addEventListener('click', () => {
    clearCanvasToBackground();
    hasDrawnInModal = false;
  });

  // ─── Modal Open / Close ───
  function openModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(initModalCanvas, 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (modalNameError) modalNameError.style.display = 'none';
  }

  if (openModalBtn) openModalBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.style.display === 'flex') {
      closeModal();
    }
  });

  // ─── Toast Notification Helper ───
  function showToast(message) {
    let toast = document.querySelector('.scrapbook-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'scrapbook-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // ─── Add Doodle to Scrapbook API ───
  function addScrapbookDoodle({ name, message, image, isDark }) {
    const userDoodles = getStoredDoodles();
    const newEntry = {
      id: 'doodle_' + Date.now(),
      name: name || 'Anonymous',
      message: message || '',
      image: image,
      isDark: Boolean(isDark),
      isNew: true,
      date: 'Just now'
    };

    userDoodles.unshift(newEntry);
    saveStoredDoodles(userDoodles);

    // Switch to first page so new card is immediately visible at index 0
    currentPage = 1;
    renderScrapbook();

    // Scroll to Scrapbook section
    const sec = document.getElementById('scrapbook');
    if (sec) {
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(`Doodle posted to Scrapbook by ${name}! 🎉`);

    // Remove isNew highlight after 4 seconds
    setTimeout(() => {
      newEntry.isNew = false;
      saveStoredDoodles(userDoodles);
      renderScrapbook();
    }, 4500);
  }

  // Expose globally so contact.js can call it directly
  window.addScrapbookDoodle = addScrapbookDoodle;

  // ─── Submit from Modal ───
  if (submitDoodleBtn) {
    submitDoodleBtn.addEventListener('click', () => {
      const nameVal = modalNameInput?.value.trim() || '';
      const msgVal = modalMsgInput?.value.trim() || '';

      if (!nameVal || nameVal.length < 2) {
        if (modalNameError) {
          modalNameError.textContent = 'Please enter your name or nickname (at least 2 letters)';
          modalNameError.style.display = 'block';
        }
        modalNameInput?.focus();
        return;
      }

      if (modalNameError) modalNameError.style.display = 'none';

      let doodleImgUrl = '';
      if (hasDrawnInModal) {
        doodleImgUrl = modalCanvas.toDataURL('image/png');
      } else {
        // If they only left a message or signature, generate a handwritten note graphic!
        const temp = document.createElement('canvas');
        temp.width = 400;
        temp.height = 400;
        const tCtx = temp.getContext('2d');
        tCtx.fillStyle = modalTheme === 'light' ? '#ffffff' : '#0a0a0f';
        tCtx.fillRect(0, 0, 400, 400);

        // Note text
        tCtx.font = '700 28px "Montserrat", sans-serif';
        tCtx.fillStyle = modalTheme === 'light' ? '#111111' : '#ffffff';
        tCtx.textAlign = 'center';
        tCtx.fillText(`"${msgVal || 'hello!'}"`, 200, 180);

        tCtx.font = '500 20px "Space Mono", monospace';
        tCtx.fillStyle = '#f40c3f';
        tCtx.fillText(`— ${nameVal}`, 200, 230);

        doodleImgUrl = temp.toDataURL('image/png');
      }

      addScrapbookDoodle({
        name: nameVal,
        message: msgVal,
        image: doodleImgUrl,
        isDark: modalTheme === 'dark'
      });

      // Clear inputs and close
      if (modalNameInput) modalNameInput.value = '';
      if (modalMsgInput) modalMsgInput.value = '';
      clearCanvasToBackground();
      hasDrawnInModal = false;
      closeModal();
    });
  }

  // Clear name error on typing
  modalNameInput?.addEventListener('input', () => {
    if (modalNameError) modalNameError.style.display = 'none';
  });

  // ─── Doodle Viewer Lightbox ───
  function openDoodleViewer(item) {
    let viewer = document.getElementById('doodle-lightbox');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'doodle-lightbox';
      viewer.className = 'poster-lightbox';
      viewer.innerHTML = `
        <div class="poster-lightbox__dialog">
          <button class="poster-lightbox__close" id="doodle-lightbox-close" aria-label="Close viewer">✕</button>
          <img class="poster-lightbox__img" id="doodle-lightbox-img" src="" alt="Doodle full view" style="background:#fff; padding:12px;" />
          <div class="poster-lightbox__caption">
            <h3 class="poster-lightbox__title" id="doodle-lightbox-title"></h3>
            <p class="poster-lightbox__cat" id="doodle-lightbox-msg"></p>
          </div>
        </div>
      `;
      document.body.appendChild(viewer);

      viewer.addEventListener('click', (e) => {
        if (e.target === viewer || e.target.id === 'doodle-lightbox-close') {
          viewer.classList.remove('is-open');
          document.body.style.overflow = '';
        }
      });
    }

    const img = viewer.querySelector('#doodle-lightbox-img');
    const title = viewer.querySelector('#doodle-lightbox-title');
    const msg = viewer.querySelector('#doodle-lightbox-msg');

    img.src = item.image;
    img.style.background = item.isDark ? '#07070a' : '#ffffff';
    title.textContent = `Doodle by ${item.name}`;
    msg.textContent = item.message ? `"${item.message}"` : `Posted in scrapbook`;

    viewer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  // Initialize
  renderScrapbook();
})();

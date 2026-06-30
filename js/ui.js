  // ============ Input Control ============
  const keys = {};
  const mouse = { x: 0, y: 0, worldX: 0, worldZ: 0, down: false };

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape' && gameState.started && !gameState.over) {
      e.preventDefault();
      togglePause();
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => keys[e.code] = false);

  const crosshair = document.getElementById('crosshair');
  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    crosshair.style.left = e.clientX + 'px';
    crosshair.style.top = e.clientY + 'px';
  });
  window.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
  window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
  window.addEventListener('contextmenu', e => e.preventDefault());

  // ============ Hit Marker ============
  function showHitMarker() {
    const hm = document.getElementById('hitMarker');
    hm.style.opacity = '1';
    setTimeout(() => hm.style.opacity = '0', 200);
  }

  // ============ Minimap ============
  const minimapCanvas = document.getElementById('minimapCanvas');
  const minimapCtx = minimapCanvas.getContext('2d');
  const minimapRange = 130;
  let minimapBg = null;

  function updateMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;

    if (!minimapBg) {
      minimapBg = document.createElement('canvas');
      minimapBg.width = w;
      minimapBg.height = h;
      const bCtx = minimapBg.getContext('2d');

      const grad = bCtx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(212, 168, 120, 0.35)');
      grad.addColorStop(0.7, 'rgba(120, 90, 60, 0.5)');
      grad.addColorStop(1, 'rgba(40, 30, 18, 0.7)');
      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.strokeStyle = 'rgba(168, 212, 104, 0.18)';
      bCtx.lineWidth = 1;
      bCtx.beginPath();
      bCtx.moveTo(w / 2, 0); bCtx.lineTo(w / 2, h);
      bCtx.moveTo(0, h / 2); bCtx.lineTo(w, h / 2);
      bCtx.stroke();

      bCtx.strokeStyle = 'rgba(168, 212, 104, 0.12)';
      for (let r = 30; r < w / 2; r += 30) {
        bCtx.beginPath();
        bCtx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        bCtx.stroke();
      }
    }

    minimapCtx.clearRect(0, 0, w, h);
    minimapCtx.drawImage(minimapBg, 0, 0);

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.group.position.x - player.group.position.x;
      const dz = e.group.position.z - player.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > minimapRange) continue;
      const px = w / 2 + (dx / minimapRange) * (w / 2);
      const py = h / 2 + (dz / minimapRange) * (h / 2);

      minimapCtx.fillStyle = 'rgba(255, 60, 60, 0.3)';
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 7, 0, Math.PI * 2);
      minimapCtx.fill();

      minimapCtx.fillStyle = '#ff3a3a';
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 3, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    // Player
    minimapCtx.save();
    minimapCtx.translate(w / 2, h / 2);
    const pdir = player.getBodyDirection();
    const pangle = Math.atan2(pdir.x, -pdir.z);
    minimapCtx.rotate(pangle);

    // Field of View Sector
    minimapCtx.fillStyle = 'rgba(168, 212, 104, 0.18)';
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, 0);
    minimapCtx.arc(0, 0, 28, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    minimapCtx.closePath();
    minimapCtx.fill();

    // Triangle
    minimapCtx.fillStyle = '#a8d468';
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -7);
    minimapCtx.lineTo(-5, 5);
    minimapCtx.lineTo(5, 5);
    minimapCtx.closePath();
    minimapCtx.fill();

    minimapCtx.strokeStyle = '#1a2410';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.stroke();

    minimapCtx.restore();

    // Border
    minimapCtx.strokeStyle = 'rgba(168, 212, 104, 0.5)';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    minimapCtx.stroke();
  }

  // ============ Button Events ============
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';
    gameState.started = true;
    audio.startBGM();
    const initOffset = new THREE.Vector3(0, 10, -14);
    initOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0);
    initOffset.add(player.group.position);
    camera.position.copy(initOffset);
    startWave(1);
    audio.startBGM();
  });

  document.getElementById('restartBtn').addEventListener('click', resetGame);
  document.getElementById('resumeBtn').addEventListener('click', () => {
    if (gameState.paused) togglePause();
  });

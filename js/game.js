  // ============ Camera Shake ============
  let cameraShake = 0;
  function addCameraShake(a) { cameraShake = Math.max(cameraShake, a); }

  // ============ Game State ============
  const gameState = {
    started: false,
    over: false,
    paused: false,
    score: 0,
    wave: 0,
    kills: 0,
    enemiesInWave: 0,
    enemiesSpawned: 0,
    spawnDelay: 0,
    waveTransition: 0,
    spawning: false,
    maxAlive: 5
  };

  function togglePause() {
    gameState.paused = !gameState.paused;
    document.getElementById('pauseScreen').style.display = gameState.paused ? 'flex' : 'none';
    if (!gameState.paused) clock.getDelta();
  }

  function startWave(n) {
    gameState.wave = n;
    gameState.enemiesInWave = 3 + n * 2;
    gameState.enemiesSpawned = 0;
    gameState.spawning = true;
    gameState.spawnDelay = 1.5;
    document.getElementById('waveValue').textContent = String(n).padStart(2, '0');
    showWaveAnnounce(`SECTOR ${String(n).padStart(2, '0')}`, `${gameState.enemiesInWave} HOSTILES INBOUND`);
    setCombatLog(`WAVE ${n} INITIATED`);
  }

  function showWaveAnnounce(main, sub) {
    const el = document.getElementById('waveAnnounce');
    el.innerHTML = `${main}<span class="sub">${sub}</span>`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2400);
  }

  function showDamage() {
    const v = document.getElementById('damageVignette');
    v.style.opacity = '1';
    setTimeout(() => v.style.opacity = '0', 250);
  }

  function setCombatLog(text) {
    document.getElementById('combatLog').textContent = text;
  }

  function gameOver() {
    gameState.over = true;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalWave').textContent = gameState.wave;
    document.getElementById('finalKills').textContent = gameState.kills;
    document.getElementById('gameOverScreen').style.display = 'flex';
    setCombatLog('CONNECTION LOST');
  }

  function resetGame() {
    for (const e of enemies) {
      e.alive = false;
      e.group.visible = false;
      deadEnemies.push(e);
    }
    enemies.length = 0;

    for (const s of shellPool) {
      s.mesh.visible = false;
      s.active = false;
    }
    for (const p of lightPool) {
      p.light.visible = false;
      p.life = 0;
    }
    particleSystem.clear();

    player.health = player.maxHealth;
    player.alive = true;
    player.group.visible = true;
    player.setPosition(0, 0);
    player.setRotation(0);
    player.turretGroup.rotation.y = 0;

    gameState.score = 0;
    gameState.kills = 0;
    gameState.over = false;
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('scoreValue').textContent = '0';
    setCombatLog('REDEPLOYING...');
    startWave(1);
    audio.startBGM();
  }

  // ============ Main Loop ============
  const clock = new THREE.Clock();
  let dustTimer = 0;
  let combatLogTimer = 0;

  function update(dt) {
    if (!gameState.started || gameState.over) {
      // Still update particles and camera
      particleSystem.update(dt);
      updatePointLights(dt);
      const lookAt = player.group.position.clone();
      lookAt.y += 2;
      camera.lookAt(lookAt);
      return;
    }

    if (gameState.paused) return;

    const now = performance.now() / 1000;

    // Player Movement
    let moveInput = 0, turnInput = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveInput += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveInput -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) turnInput += 1;
    if (keys['KeyD'] || keys['ArrowRight']) turnInput -= 1;

    const speedMult = (keys['ShiftLeft'] || keys['ShiftRight']) ? 1.7 : 1.0;
    player.group.rotation.y += turnInput * player.turnSpeed * dt;

    const targetSpeed = moveInput * player.maxSpeed * speedMult;
    player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 4);

    if (Math.abs(player.speed) > 0.01) {
      const dir = player.getBodyDirection();
      const newX = player.group.position.x + dir.x * player.speed * dt;
      const newZ = player.group.position.z + dir.z * player.speed * dt;
      const bound = 175;
      if (Math.abs(newX) < bound) player.group.position.x = newX;
      if (Math.abs(newZ) < bound) player.group.position.z = newZ;
      player.group.position.y = getTerrainHeight(player.group.position.x, player.group.position.z);

      // Follow Terrain Slope
      const aheadY = getTerrainHeight(
        player.group.position.x + dir.x * 2.5,
        player.group.position.z + dir.z * 2.5
      );
      const behindY = getTerrainHeight(
        player.group.position.x - dir.x * 2.5,
        player.group.position.z - dir.z * 2.5
      );
      const slope = Math.atan2(aheadY - behindY, 5);
      player.group.rotation.x = -slope * 0.85;

      // Sand Dust
      dustTimer += dt;
      if (dustTimer > 0.045) {
        dustTimer = 0;
        const dustPos = player.group.position.clone();
        const back = player.getBodyDirection().multiplyScalar(-2.6);
        dustPos.add(back);
        dustPos.y = getTerrainHeight(dustPos.x, dustPos.z);
        createDust(dustPos, Math.abs(player.speed) / player.maxSpeed);
      }
    } else {
      player.group.rotation.x *= Math.pow(0.001, dt);
    }

    // PlayerTurret Aiming
    updateAimTarget();
    const aimDx = mouse.worldX - player.group.position.x;
    const aimDz = mouse.worldZ - player.group.position.z;
    const aimAngle = Math.atan2(aimDx, aimDz);

    const turretWorldY = player.group.rotation.y + player.turretGroup.rotation.y;
    let diff = aimAngle - turretWorldY;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = Math.sign(diff) * Math.min(Math.abs(diff), player.turretTurnSpeed * dt);
    player.turretGroup.rotation.y += turn;

    // PlayerFiring
    const reloadEl = document.getElementById('reloadStatus');
    if (player.canFire(now)) {
      if (gameState.lastReload !== 'READY') {
        gameState.lastReload = 'READY';
        reloadEl.textContent = 'READY';
        reloadEl.style.color = '#a8d468';
      }
    } else {
      const r = (now - player.lastFireTime) / player.fireRate;
      const text = `RELOADING ${Math.floor((1 - r) * 100)}%`;
      if (gameState.lastReload !== text) {
        gameState.lastReload = text;
        reloadEl.textContent = text;
        reloadEl.style.color = '#c8854a';
      }
    }

    const aimDist2D = Math.sqrt(aimDx * aimDx + aimDz * aimDz);
    const targetPitch = aimDist2D * 0.0024;
    player.turretGroup.rotation.x += (-targetPitch - player.turretGroup.rotation.x) * dt * 5;

    if (mouse.down && player.canFire(now)) {
      const muzzlePos = player.getMuzzleWorldPosition();
      const fireDir = player.getMuzzleWorldDirection();
      spawnShell(muzzlePos, fireDir, player);
      createMuzzleFlash(muzzlePos, fireDir);
      audio.shoot();
      player.fire(now);
      addCameraShake(0.08);
      setCombatLog('CANNON ENGAGED');
      combatLogTimer = 1.5;
    }

    // Enemies AI
    let aliveEnemyCount = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.alive) {
        e.group.visible = false;
        deadEnemies.push(e);
        enemies.splice(i, 1);
        continue;
      }
      aliveEnemyCount++;
      e.update(dt);

      const dx = player.group.position.x - e.group.position.x;
      const dz = player.group.position.z - e.group.position.z;
      const distToPlayer = Math.sqrt(dx * dx + dz * dz);

      // Hull Facing Player
      const desiredBody = Math.atan2(dx, dz);
      let bodyDiff = desiredBody - e.group.rotation.y;
      bodyDiff = Math.atan2(Math.sin(bodyDiff), Math.cos(bodyDiff));
      e.group.rotation.y += Math.sign(bodyDiff) * Math.min(Math.abs(bodyDiff), 0.9 * dt);

      // Movement Strategy
      let moveDir = 0;
      if (distToPlayer > 45) moveDir = 1;
      else if (distToPlayer < 28) moveDir = -0.5;
      else moveDir = Math.sin(now * 0.5 + i) * 0.4;

      const eDir = e.getBodyDirection();
      const targetSpeed = moveDir * e.maxSpeed;
      e.speed += (targetSpeed - e.speed) * Math.min(1, dt * 2);

      const newX = e.group.position.x + eDir.x * e.speed * dt;
      const newZ = e.group.position.z + eDir.z * e.speed * dt;
      if (Math.abs(newX) < 175) e.group.position.x = newX;
      if (Math.abs(newZ) < 175) e.group.position.z = newZ;
      e.group.position.y = getTerrainHeight(e.group.position.x, e.group.position.z);

      // Turret Aiming
      const desiredTurret = Math.atan2(dx, dz);
      const tWorldY = e.group.rotation.y + e.turretGroup.rotation.y;
      let tDiff = desiredTurret - tWorldY;
      tDiff = Math.atan2(Math.sin(tDiff), Math.cos(tDiff));
      const tTurn = Math.sign(tDiff) * Math.min(Math.abs(tDiff), e.turretTurnSpeed * dt);
      e.turretGroup.rotation.y += tTurn;

      const eTargetPitch = distToPlayer * 0.0048;
      e.turretGroup.rotation.x += (-eTargetPitch - e.turretGroup.rotation.x) * dt * 5;

      // Firing
      if (distToPlayer < 90 && Math.abs(tDiff) < 0.18 && e.canFire(now)) {
        const muzzlePos = e.getMuzzleWorldPosition();
        const fireDir = e.getMuzzleWorldDirection();
        fireDir.x += (Math.random() - 0.5) * 0.06;
        fireDir.z += (Math.random() - 0.5) * 0.06;
        fireDir.normalize();
        spawnShell(muzzlePos, fireDir, e, 60);
        createMuzzleFlash(muzzlePos, fireDir);
      audio.shoot();
        e.fire(now);
      }
    }

    // Update Shells
    for (let i = 0; i < shellPool.length; i++) {
      const s = shellPool[i];
      if (!s.active) continue;

      s.velocity.y -= 35 * dt;
      s.mesh.position.x += s.velocity.x * dt;
      s.mesh.position.y += s.velocity.y * dt;
      s.mesh.position.z += s.velocity.z * dt;
      s.life -= dt;

      const target = s.mesh.position.clone().add(s.velocity);
      s.mesh.lookAt(target);

      let hit = false;

      // Ground Collision
      const groundY = getTerrainHeight(s.mesh.position.x, s.mesh.position.z);
      if (s.mesh.position.y <= groundY + 0.25) {
        createExplosion(s.mesh.position, 0.55);
        hit = true;
      }

      // Tank Collision
      if (!hit) {
        if (s.owner === player) {
          for (const e of enemies) {
            if (!e.alive) continue;
            const dx = s.mesh.position.x - e.group.position.x;
            const dy = s.mesh.position.y - (e.group.position.y + 1.5);
            const dz = s.mesh.position.z - e.group.position.z;
            if (dx * dx + dy * dy + dz * dz < 9) {
              createExplosion(s.mesh.position, 1.3);
              audio.hit();
              showHitMarker();
              const destroyed = e.takeDamage(s.damage);
              if (destroyed) {
                createExplosion(e.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 2.6);
                audio.explosion();
                gameState.kills++;
                gameState.score += 100;
                const sv = document.getElementById('scoreValue');
                sv.textContent = gameState.score;
                sv.classList.remove('pulse');
                void sv.offsetWidth;
                sv.classList.add('pulse');
                setCombatLog(`HOSTILE ELIMINATED +100`);
                combatLogTimer = 2.0;
              } else {
                setCombatLog(`TARGET HIT`);
                combatLogTimer = 1.0;
              }
              hit = true;
              break;
            }
          }
        } else {
          const dx = s.mesh.position.x - player.group.position.x;
          const dy = s.mesh.position.y - (player.group.position.y + 1.5);
          const dz = s.mesh.position.z - player.group.position.z;
          if (dx * dx + dy * dy + dz * dz < 9) {
            createExplosion(s.mesh.position, 1.1);
            audio.hit();
            const destroyed = player.takeDamage(s.damage);
            showDamage();
            addCameraShake(0.2);
            setCombatLog('HULL DAMAGE TAKEN');
            combatLogTimer = 2.0;
            if (destroyed) {
              createExplosion(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 3.2);
              audio.explosion();
              player.group.visible = false;
              gameOver();
            }
            hit = true;
          }
        }
      }

      if (hit || s.life <= 0) {
        s.mesh.visible = false;
        s.active = false;
      }
    }

    // Spawn Enemies
    if (gameState.spawning && gameState.enemiesSpawned < gameState.enemiesInWave) {
      if (aliveEnemyCount < gameState.maxAlive) {
        gameState.spawnDelay -= dt;
        if (gameState.spawnDelay <= 0) {
          spawnEnemy();
          gameState.enemiesSpawned++;
          gameState.spawnDelay = 1.5 + Math.random() * 1.8;
        }
      }
    }

    // Wave Completion Check
    if (gameState.enemiesSpawned >= gameState.enemiesInWave && aliveEnemyCount === 0 && !gameState.over) {
      gameState.spawning = false;
      gameState.waveTransition += dt;
      if (gameState.waveTransition > 3.5) {
        gameState.waveTransition = 0;
        startWave(gameState.wave + 1);
      }
    }

    // Update HUD
    const hpVal = Math.max(0, Math.floor(player.health));
    if (gameState.lastHp !== hpVal) {
      gameState.lastHp = hpVal;
      document.getElementById('healthValue').textContent = hpVal;
      const hpPct = (player.health / player.maxHealth) * 100;
      const hb = document.getElementById('healthBar');
      hb.style.width = hpPct + '%';
      if (hpPct < 30) hb.classList.add('low');
      else hb.classList.remove('low');
    }

    if (gameState.lastEnemyCount !== aliveEnemyCount) {
      gameState.lastEnemyCount = aliveEnemyCount;
      document.getElementById('enemyCount').textContent = aliveEnemyCount;
    }

    // Combat Log Timer
    if (combatLogTimer > 0) {
      combatLogTimer -= dt;
      if (combatLogTimer <= 0) setCombatLog('STANDING BY');
    }

    // Update Particles
    particleSystem.update(dt);
    updatePointLights(dt);

    // Player Update
    player.update(dt);

    // Camera Follow
    if (!camera.userData.smoothPos) camera.userData.smoothPos = player.group.position.clone();
    camera.userData.smoothPos.lerp(player.group.position, Math.min(1, dt * 10));

    const idealOffset = new THREE.Vector3(0, 10, -14);
    idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.group.rotation.y);
    idealOffset.add(camera.userData.smoothPos);

    const lookAt = camera.userData.smoothPos.clone();
    lookAt.y += 2;

    if (!camera.userData.truePos) camera.userData.truePos = camera.position.clone();
    camera.userData.truePos.lerp(idealOffset, Math.min(1, dt * 4.5));
    
    camera.position.copy(camera.userData.truePos);

    // Camera Shake
    if (cameraShake > 0) {
      camera.position.x += (Math.random() - 0.5) * cameraShake * 0.4;
      camera.position.y += (Math.random() - 0.5) * cameraShake * 0.4;
      camera.position.z += (Math.random() - 0.5) * cameraShake * 0.4;
      cameraShake = Math.max(0, cameraShake - dt * 4.0);
    }
    
    camera.lookAt(lookAt);

    // Minimap
    updateMinimap();
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    renderer.render(scene, camera);
  }

  // Window Resize Adjustment
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  animate();
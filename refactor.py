import re
import os

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Localization
translations = {
    'zh-CN': 'en',
    'Desert Steel — 沙漠坦克战': 'Desert Steel',
    '沙漠坦克战 · OPERATION DUNEBREAKER': 'OPERATION DUNEBREAKER',
    '前进 / 后退': 'Forward / Backward',
    '左转 / 右转': 'Turn Left / Turn Right',
    '瞄准炮塔': 'Aim Turret',
    '主炮开火': 'Fire Cannon',
    '引擎加速': 'Engine Boost',
    '坦克已被击毁': 'TANK DESTROYED',
    
    # Comments translation
    '============ 场景初始化 ============': '============ Scene Initialization ============',
    '============ 天空：着色器渐变 ============': '============ Sky: Shader Gradient ============',
    '太阳光晕': 'Sun Glow',
    '太阳': 'Sun',
    '============ 光照 ============': '============ Lighting ============',
    '============ 地形高度函数 ============': '============ Terrain Height Function ============',
    '============ 地形网格 ============': '============ Terrain Mesh ============',
    '============ 岩石和碎屑 ============': '============ Rocks and Debris ============',
    '周围碎屑': 'Surrounding Debris',
    '============ 远处岩石台地 ============': '============ Distant Rock Mesas ============',
    '============ 坦克类 ============': '============ Tank Class ============',
    '前倾斜装甲': 'Front Sloped Armor',
    '车体': 'Hull',
    '后装甲': 'Rear Armor',
    '翼子板': 'Fenders',
    '履带与负重轮': 'Tracks and Road Wheels',
    '履带表面纹路': 'Track Surface Treads',
    '负重轮': 'Road Wheels',
    '主动轮和诱导轮': 'Drive Sprocket and Idler Wheel',
    '炮塔组': 'Turret Group',
    '炮塔主体': 'Turret Base',
    '炮塔顶部': 'Turret Top',
    '炮塔前装甲': 'Turret Front Armor',
    '舱盖把手': 'Hatch Handle',
    '舱盖': 'Hatch',
    '炮盾': 'Gun Mantlet',
    '长炮管': 'Long Barrel',
    '炮口制退器': 'Muzzle Brake',
    '天线顶部红点': 'Antenna Tip Red Dot',
    '天线': 'Antenna',
    '车长指挥塔': 'Commander\'s Cupola',
    '螺栓细节': 'Bolt Details',
    '工具箱': 'Toolboxes',
    '炮口位置': 'Muzzle Position',
    '敌人下方标记': 'Enemy Under-marker',
    '车轮转动': 'Wheel Rotation',
    '敌人标记动画': 'Enemy Marker Animation',
    '============ 玩家坦克 ============': '============ Player Tank ============',
    '============ 敌人管理 ============': '============ Enemy Management ============',
    '============ 炮弹管理 ============': '============ Shell Management ============',
    '光源': 'Light Source',
    '拖尾': 'Trail',
    '朝向：让 -Z 指向飞行方向': 'Orientation: Make -Z point in flight direction',
    '============ 粒子系统 ============': '============ Particle System ============',
    '火球': 'Fireball',
    '烟雾': 'Smoke',
    '碎片': 'Debris',
    '沙土飞溅': 'Sand Splashes',
    '闪光火球': 'Flash Fireball',
    '闪光灯': 'Flash Light',
    '闪光': 'Flash',
    '弹跳': 'Bounce',
    '============ 输入控制 ============': '============ Input Control ============',
    '============ 瞄准射线 ============': '============ Aim Ray ============',
    '============ 相机震动 ============': '============ Camera Shake ============',
    '============ 命中标记 ============': '============ Hit Marker ============',
    '============ 游戏状态 ============': '============ Game State ============',
    '============ 小地图 ============': '============ Minimap ============',
    '背景': 'Background',
    '网格': 'Grid',
    '同心圆': 'Concentric Circles',
    '敌人': 'Enemies',
    '玩家': 'Player',
    '视野扇形': 'Field of View Sector',
    '三角形': 'Triangle',
    '边框': 'Border',
    '============ 按钮事件 ============': '============ Button Events ============',
    '============ 主循环 ============': '============ Main Loop ============',
    '玩家炮塔瞄准': 'Player Turret Aiming',
    '玩家移动': 'Player Movement',
    '跟随地形倾斜': 'Follow Terrain Slope',
    '沙尘': 'Sand Dust',
    '玩家开火': 'Player Firing',
    '敌人 AI': 'Enemy AI',
    '车体朝向玩家': 'Hull Facing Player',
    '移动策略': 'Movement Strategy',
    '炮塔瞄准': 'Turret Aiming',
    '开火': 'Firing',
    '更新炮弹': 'Update Shells',
    '地面碰撞': 'Ground Collision',
    '坦克碰撞': 'Tank Collision',
    '生成敌人': 'Spawn Enemies',
    '波次完成检查': 'Wave Completion Check',
    '更新 HUD': 'Update HUD',
    '战斗日志计时': 'Combat Log Timer',
    '更新粒子': 'Update Particles',
    '玩家更新': 'Player Update',
    '相机跟随': 'Camera Follow',
    '窗口大小调整': 'Window Resize Adjustment',
    '仍更新粒子和相机': 'Still update particles and camera'
}

for k, v in translations.items():
    content = content.replace(k, v)

# 2. Local execution fix (remove module and importmap, use global script)
content = re.sub(
    r'<script type="importmap">[\s\S]*?</script>\s*<script type="module">\s*import \* as THREE from \'three\';',
    '<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>\\n  <script>',
    content
)

# 3. Bug Fixes & Edge Cases

# Angle Normalization logic (Player Turret)
old_aim = """    let diff = aimAngle - turretWorldY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;"""
new_aim = """    let diff = aimAngle - turretWorldY;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));"""
content = content.replace(old_aim, new_aim)

# Angle Normalization logic (Enemy Body)
old_enemy_body = """      let bodyDiff = desiredBody - e.group.rotation.y;
      while (bodyDiff > Math.PI) bodyDiff -= Math.PI * 2;
      while (bodyDiff < -Math.PI) bodyDiff += Math.PI * 2;"""
new_enemy_body = """      let bodyDiff = desiredBody - e.group.rotation.y;
      bodyDiff = Math.atan2(Math.sin(bodyDiff), Math.cos(bodyDiff));"""
content = content.replace(old_enemy_body, new_enemy_body)

# Angle Normalization logic (Enemy Turret)
old_enemy_turret = """      let tDiff = desiredTurret - tWorldY;
      while (tDiff > Math.PI) tDiff -= Math.PI * 2;
      while (tDiff < -Math.PI) tDiff += Math.PI * 2;"""
new_enemy_turret = """      let tDiff = desiredTurret - tWorldY;
      tDiff = Math.atan2(Math.sin(tDiff), Math.cos(tDiff));"""
content = content.replace(old_enemy_turret, new_enemy_turret)

# Player Sliding on Boundary
old_player_bound = """      if (Math.abs(newX) < bound) player.group.position.x = newX;
      if (Math.abs(newZ) < bound) player.group.position.z = newZ;"""
new_player_bound = """      if (Math.abs(newX) < bound) player.group.position.x = newX;
      else player.speed = 0;
      if (Math.abs(newZ) < bound) player.group.position.z = newZ;
      else player.speed = 0;"""
content = content.replace(old_player_bound, new_player_bound)

# Enemy Sliding on Boundary
old_enemy_bound = """      if (Math.abs(newX) < 175) e.group.position.x = newX;
      if (Math.abs(newZ) < 175) e.group.position.z = newZ;"""
new_enemy_bound = """      if (Math.abs(newX) < 175) e.group.position.x = newX;
      else e.speed = 0;
      if (Math.abs(newZ) < 175) e.group.position.z = newZ;
      else e.speed = 0;"""
content = content.replace(old_enemy_bound, new_enemy_bound)

# 4. Optimization: Particle Geometry and Material Sharing

shared_particles_init = """
  // ============ Shared Particle Resources ============
  const sharedGeoSphere = new THREE.SphereGeometry(1, 6, 6);
  const sharedGeoBox = new THREE.BoxGeometry(1, 1, 1);
  const sharedMatFireball = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const sharedMatSmoke = new THREE.MeshBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.55, depthWrite: false });
  const sharedMatDebris = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
  const sharedMatDust = new THREE.MeshBasicMaterial({ color: 0xd4a878, transparent: true, opacity: 0.45, depthWrite: false });
  const sharedMatSandSplash = new THREE.MeshBasicMaterial({ color: 0xd4a878, transparent: true, opacity: 0.8, depthWrite: false });
  const sharedMatMuzzleFire = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
"""

content = content.replace('  const particles = [];', shared_particles_init + '\\n  const particles = [];')

# Replace Fireball
old_fireball = """      const geo = new THREE.SphereGeometry(0.3 * scale, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.05 + Math.random() * 0.1, 1, 0.55),
        transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);"""
new_fireball = """      const mat = sharedMatFireball.clone();
      mat.color.setHSL(0.05 + Math.random() * 0.1, 1, 0.55);
      const mesh = new THREE.Mesh(sharedGeoSphere, mat);
      mesh.scale.setScalar(0.3 * scale);"""
content = content.replace(old_fireball, new_fireball)

# Replace Smoke
old_smoke = """      const geo = new THREE.SphereGeometry(0.55 * scale, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0, 0, 0.12 + Math.random() * 0.18),
        transparent: true, opacity: 0.75, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);"""
new_smoke = """      const mat = sharedMatSmoke.clone();
      mat.color.setHSL(0, 0, 0.12 + Math.random() * 0.18);
      const mesh = new THREE.Mesh(sharedGeoSphere, mat);
      mesh.scale.setScalar(0.55 * scale);"""
content = content.replace(old_smoke, new_smoke)

# Replace Debris
old_debris = """      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);"""
new_debris = """      const mesh = new THREE.Mesh(sharedGeoBox, sharedMatDebris);
      mesh.scale.setScalar(0.2);"""
content = content.replace(old_debris, new_debris)

# Replace Sand Splashes
old_splash = """      const geo = new THREE.SphereGeometry(0.2 * scale, 5, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd4a878, transparent: true, opacity: 0.8, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);"""
new_splash = """      const mesh = new THREE.Mesh(sharedGeoSphere, sharedMatSandSplash);
      mesh.scale.setScalar(0.2 * scale);"""
content = content.replace(old_splash, new_splash)

# Replace Muzzle Flash Fireball
old_muzzle_fire = """      const geo = new THREE.SphereGeometry(0.16 + Math.random() * 0.1, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd060, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);"""
new_muzzle_fire = """      const mesh = new THREE.Mesh(sharedGeoSphere, sharedMatMuzzleFire);
      mesh.scale.setScalar(0.16 + Math.random() * 0.1);"""
content = content.replace(old_muzzle_fire, new_muzzle_fire)

# Replace Muzzle Flash Smoke
old_muzzle_smoke = """      const geo = new THREE.SphereGeometry(0.22, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x8a8a8a, transparent: true, opacity: 0.55, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);"""
new_muzzle_smoke = """      const mesh = new THREE.Mesh(sharedGeoSphere, sharedMatSmoke);
      mesh.scale.setScalar(0.22);"""
content = content.replace(old_muzzle_smoke, new_muzzle_smoke)

# Replace Dust
old_dust = """      const geo = new THREE.SphereGeometry(0.32, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd4a878, transparent: true, opacity: 0.45, depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);"""
new_dust = """      const mesh = new THREE.Mesh(sharedGeoSphere, sharedMatDust);
      mesh.scale.setScalar(0.32);"""
content = content.replace(old_dust, new_dust)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Refactoring complete.")

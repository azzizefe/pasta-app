/* ==========================================================================
   LUMIÈRE SUCRÉE — THREE.JS 60 FPS HAUTE PÂTISSERIE 3D WEBGL ENGINE
   Procedural Multi-Tier Baroque Cake, 24K Gold Leaf Pearls & Gold Dust Particles
   ========================================================================== */

(function () {
  'use strict';

  const FINISH_PALETTES = {
    ivory: {
      name: 'Fildişi Kadife',
      hex: '#FAF6F0',
      color: 0xfaf6f0,
      roughness: 0.42,
      metalness: 0.05,
      accentHex: '#C5A059',
      accentColor: 0xc5a059,
    },
    champagne: {
      name: 'Şampanya Altını',
      hex: '#F3E3C3',
      color: 0xf3e3c3,
      roughness: 0.26,
      metalness: 0.32,
      accentHex: '#D4AF37',
      accentColor: 0xd4af37,
    },
    midnight: {
      name: 'Gece Mavisi Barok',
      hex: '#1E293B',
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.18,
      accentHex: '#E5C158',
      accentColor: 0xe5c158,
    },
    rose: {
      name: 'Velours Rose',
      hex: '#EED6D3',
      color: 0xeed6d3,
      roughness: 0.38,
      metalness: 0.08,
      accentHex: '#C5A059',
      accentColor: 0xc5a059,
    },
    noir: {
      name: "L'Étoile Noire (Kakao)",
      hex: '#2B1B14',
      color: 0x2b1b14,
      roughness: 0.32,
      metalness: 0.15,
      accentHex: '#D9B36C',
      accentColor: 0xd9b36c,
    },
    pistachio: {
      name: 'Jardin Pistache',
      hex: '#D7E2CE',
      color: 0xd7e2ce,
      roughness: 0.4,
      metalness: 0.06,
      accentHex: '#C5A059',
      accentColor: 0xc5a059,
    },
  };

  // Tier geometry specs (bottom to top)
  const TIER_DEFS = [
    { radius: 1.55, height: 0.92, pearls: 34 },
    { radius: 1.18, height: 0.86, pearls: 26 },
    { radius: 0.84, height: 0.80, pearls: 20 },
    { radius: 0.54, height: 0.72, pearls: 14 },
  ];

  class LumiereCakeStudio3D {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas || typeof THREE === 'undefined') return;

      this.state = {
        tiers: 3,
        finish: 'ivory',
        ornament: 'gold_leaf',
        exploded: false,
      };

      this.isDragging = false;
      this.prevPointer = { x: 0, y: 0 };
      this.targetRotationY = 0.45;
      this.currentRotationY = 0.45;
      this.targetRotationX = 0.08;
      this.currentRotationX = 0.08;
      this.autoRotateSpeed = 0.0032;
      this.clock = new THREE.Clock();

      this.tierMeshes = [];
      this.fondantMaterials = [];
      this.goldMaterials = [];
      this.ornamentGroups = {};

      this.initScene();
      this.initLights();
      this.buildPedestal();
      this.buildTiers();
      this.buildOrnaments();
      this.buildGoldDustParticles();
      this.bindEvents();
      this.updateCakeConfiguration({ animate: false });
      this.animate();
    }

    initScene() {
      const parent = this.canvas.parentElement;
      const width = parent.clientWidth || 540;
      const height = parent.clientHeight || 460;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
      this.camera.position.set(0, 2.35, 7.6);
      this.camera.lookAt(0, 0.95, 0);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.sRGBEncoding !== undefined) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;

      this.rootGroup = new THREE.Group();
      this.rootGroup.position.y = -0.75;
      this.scene.add(this.rootGroup);
    }

    initLights() {
      const ambient = new THREE.AmbientLight(0xfff8ed, 0.78);
      this.scene.add(ambient);

      const hemiLight = new THREE.HemisphereLight(0xfffdf9, 0xe6d5b8, 0.55);
      hemiLight.position.set(0, 10, 0);
      this.scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.25);
      keyLight.position.set(4.5, 8.5, 5.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.bias = -0.001;
      this.scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xf7e9ce, 0.85);
      rimLight.position.set(-5.0, 4.0, -4.5);
      this.scene.add(rimLight);

      const goldSpot = new THREE.PointLight(0xd4af37, 0.7, 12);
      goldSpot.position.set(0, 4.8, 2.5);
      this.scene.add(goldSpot);
    }

    createGoldMaterial() {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.86,
        roughness: 0.22,
      });
      this.goldMaterials.push(mat);
      return mat;
    }

    buildPedestal() {
      const pedestalGroup = new THREE.Group();

      const marbleMat = new THREE.MeshStandardMaterial({
        color: 0xfdfbf7,
        roughness: 0.25,
        metalness: 0.05,
      });
      const goldMat = this.createGoldMaterial();

      // Platter top plate
      const plateGeo = new THREE.CylinderGeometry(1.92, 1.84, 0.12, 64);
      const plateMesh = new THREE.Mesh(plateGeo, marbleMat);
      plateMesh.position.y = -0.06;
      plateMesh.receiveShadow = true;
      pedestalGroup.add(plateMesh);

      // Gold rim torus around platter
      const rimGeo = new THREE.TorusGeometry(1.9, 0.045, 20, 72);
      const rimMesh = new THREE.Mesh(rimGeo, goldMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = -0.05;
      pedestalGroup.add(rimMesh);

      // Pedestal pillar
      const stemGeo = new THREE.CylinderGeometry(0.45, 0.68, 0.65, 48);
      const stemMesh = new THREE.Mesh(stemGeo, marbleMat);
      stemMesh.position.y = -0.42;
      pedestalGroup.add(stemMesh);

      // Pedestal base ring
      const baseGeo = new THREE.CylinderGeometry(1.12, 1.24, 0.14, 48);
      const baseMesh = new THREE.Mesh(baseGeo, goldMat);
      baseMesh.position.y = -0.78;
      pedestalGroup.add(baseMesh);

      this.rootGroup.add(pedestalGroup);
    }

    buildTiers() {
      const palette = FINISH_PALETTES[this.state.finish];
      const fondantMat = new THREE.MeshStandardMaterial({
        color: palette.color,
        roughness: palette.roughness,
        metalness: palette.metalness,
      });
      this.fondantMaterials.push(fondantMat);

      const goldMat = this.createGoldMaterial();
      const fillingMat = new THREE.MeshStandardMaterial({
        color: 0x9e2a3b,
        roughness: 0.5,
      });

      let currentY = 0;

      TIER_DEFS.forEach((def, index) => {
        const tierGroup = new THREE.Group();
        const baseRestY = currentY + def.height / 2;
        tierGroup.userData = {
          index,
          baseRestY,
          height: def.height,
          radius: def.radius,
        };

        // Main cylinder body
        const bodyGeo = new THREE.CylinderGeometry(def.radius, def.radius, def.height, 64);
        const bodyMesh = new THREE.Mesh(bodyGeo, fondantMat);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        tierGroup.add(bodyMesh);

        // Inner gourmet filling ring (visible in Exploded View)
        const innerGeo = new THREE.CylinderGeometry(def.radius * 0.92, def.radius * 0.92, 0.08, 48);
        const innerMesh = new THREE.Mesh(innerGeo, fillingMat);
        innerMesh.position.y = -def.height / 2 + 0.02;
        tierGroup.add(innerMesh);

        // Top gold leaf piping ring
        const topRingGeo = new THREE.TorusGeometry(def.radius, 0.026, 16, 64);
        const topRing = new THREE.Mesh(topRingGeo, goldMat);
        topRing.rotation.x = Math.PI / 2;
        topRing.position.y = def.height / 2 - 0.01;
        tierGroup.add(topRing);

        // Bottom 24K pearl necklace ring
        const pearlGeo = new THREE.SphereGeometry(0.044, 14, 14);
        for (let p = 0; p < def.pearls; p++) {
          const angle = (p / def.pearls) * Math.PI * 2;
          const pearl = new THREE.Mesh(pearlGeo, goldMat);
          pearl.position.set(
            Math.cos(angle) * (def.radius + 0.015),
            -def.height / 2 + 0.04,
            Math.sin(angle) * (def.radius + 0.015)
          );
          tierGroup.add(pearl);
        }

        // Baroque side relief medallions / gold leaf flecks
        const fleckCount = 8;
        const medallionGeo = new THREE.OctahedronGeometry(0.055, 0);
        for (let f = 0; f < fleckCount; f++) {
          const angle = (f / fleckCount) * Math.PI * 2 + index * 0.4;
          const medallion = new THREE.Mesh(medallionGeo, goldMat);
          medallion.scale.set(1.2, 1.6, 0.45);
          medallion.position.set(
            Math.cos(angle) * (def.radius + 0.01),
            0,
            Math.sin(angle) * (def.radius + 0.01)
          );
          medallion.lookAt(0, 0, 0);
          tierGroup.add(medallion);
        }

        tierGroup.position.y = baseRestY;
        this.rootGroup.add(tierGroup);
        this.tierMeshes.push(tierGroup);

        currentY += def.height;
      });
    }

    buildOrnaments() {
      this.topperContainer = new THREE.Group();
      this.rootGroup.add(this.topperContainer);

      const goldMat = this.createGoldMaterial();
      const blushMat = new THREE.MeshStandardMaterial({
        color: 0xf4c7c3,
        roughness: 0.35,
        metalness: 0.08,
      });
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.6,
      });

      // 1. Gold Leaf & Imperial Crown
      const goldLeafGroup = new THREE.Group();
      const crownRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 16, 48), goldMat);
      crownRing1.position.y = 0.28;
      goldLeafGroup.add(crownRing1);

      const crownRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 16, 48), goldMat);
      crownRing2.rotation.y = Math.PI / 2;
      crownRing2.position.y = 0.28;
      goldLeafGroup.add(crownRing2);

      const topOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 1), goldMat);
      topOrb.position.y = 0.65;
      goldLeafGroup.add(topOrb);
      this.ornamentGroups['gold_leaf'] = goldLeafGroup;
      this.topperContainer.add(goldLeafGroup);

      // 2. Baroque Sugar Roses
      const rosesGroup = new THREE.Group();
      const rosePositions = [
        { x: 0, y: 0.22, z: 0, s: 1.1 },
        { x: 0.22, y: 0.14, z: 0.14, s: 0.8 },
        { x: -0.2, y: 0.14, z: 0.16, s: 0.78 },
        { x: 0.05, y: 0.14, z: -0.22, s: 0.85 },
      ];
      rosePositions.forEach((rp, idx) => {
        const knotGeo = new THREE.TorusKnotGeometry(0.12 * rp.s, 0.042 * rp.s, 64, 12, 2, 3);
        const mesh = new THREE.Mesh(knotGeo, idx === 0 ? goldMat : blushMat);
        mesh.position.set(rp.x, rp.y, rp.z);
        mesh.rotation.x = Math.PI / 2;
        rosesGroup.add(mesh);
      });
      this.ornamentGroups['sugar_roses'] = rosesGroup;
      this.topperContainer.add(rosesGroup);

      // 3. Crystal Tiara & Paris Macarons
      const macaronGroup = new THREE.Group();
      const macPositions = [
        { x: -0.18, y: 0.1, z: 0.12 },
        { x: 0.18, y: 0.1, z: 0.12 },
        { x: 0, y: 0.22, z: 0 },
      ];
      macPositions.forEach((mp, idx) => {
        const shellGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 24);
        const shell = new THREE.Mesh(shellGeo, idx === 2 ? goldMat : blushMat);
        shell.position.set(mp.x, mp.y, mp.z);
        shell.rotation.z = idx === 2 ? 0.18 : -0.1;
        macaronGroup.add(shell);
      });
      const spireGeo = new THREE.ConeGeometry(0.12, 0.55, 8);
      const spire = new THREE.Mesh(spireGeo, crystalMat);
      spire.position.set(0, 0.42, -0.1);
      macaronGroup.add(spire);

      this.ornamentGroups['crystal_crown'] = macaronGroup;
      this.topperContainer.add(macaronGroup);
    }

    buildGoldDustParticles() {
      const count = 280;
      const positions = new Float32Array(count * 3);
      const speeds = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const radius = 1.6 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        const y = -0.8 + Math.random() * 4.4;

        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(theta) * radius;
        speeds[i] = 0.15 + Math.random() * 0.35;
      }

      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.userData = { speeds };

      // Create soft circular glow sprite in memory
      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = 64;
      spriteCanvas.height = 64;
      const ctx = spriteCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 244, 214, 1)');
      grad.addColorStop(0.4, 'rgba(197, 160, 89, 0.85)');
      grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(spriteCanvas);

      const particleMat = new THREE.PointsMaterial({
        size: 0.11,
        map: texture,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.particles = new THREE.Points(particleGeo, particleMat);
      this.scene.add(this.particles);
    }

    updateCakeConfiguration({ animate = true } = {}) {
      const activeTiers = this.state.tiers;
      const explodedOffset = this.state.exploded ? 0.38 : 0;
      const palette = FINISH_PALETTES[this.state.finish] || FINISH_PALETTES.ivory;

      // Update fondant color & material properties
      this.fondantMaterials.forEach((mat) => {
        if (animate && typeof gsap !== 'undefined') {
          const targetColor = new THREE.Color(palette.color);
          gsap.to(mat.color, {
            r: targetColor.r,
            g: targetColor.g,
            b: targetColor.b,
            duration: 0.65,
            ease: 'power2.out',
          });
        } else {
          mat.color.setHex(palette.color);
        }
        mat.roughness = palette.roughness;
        mat.metalness = palette.metalness;
      });

      // Animate tiers visibility, scale, and vertical position
      let topSurfaceY = 0;
      this.tierMeshes.forEach((tierGroup, idx) => {
        const isVisible = idx < activeTiers;
        const targetY = tierGroup.userData.baseRestY + idx * explodedOffset;
        if (isVisible) {
          topSurfaceY = targetY + tierGroup.userData.height / 2;
        }

        if (animate && typeof gsap !== 'undefined') {
          if (isVisible) {
            tierGroup.visible = true;
            gsap.to(tierGroup.scale, {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.6,
              ease: 'back.out(1.4)',
            });
            gsap.to(tierGroup.position, {
              y: targetY,
              duration: 0.6,
              ease: 'power3.out',
            });
          } else {
            gsap.to(tierGroup.scale, {
              x: 0.01,
              y: 0.01,
              z: 0.01,
              duration: 0.35,
              ease: 'power2.in',
              onComplete: () => {
                if (idx >= this.state.tiers) tierGroup.visible = false;
              },
            });
          }
        } else {
          tierGroup.visible = isVisible;
          tierGroup.scale.setScalar(isVisible ? 1 : 0.01);
          tierGroup.position.y = targetY;
        }
      });

      // Position and switch ornament topper
      Object.keys(this.ornamentGroups).forEach((key) => {
        this.ornamentGroups[key].visible = key === this.state.ornament;
      });

      if (animate && typeof gsap !== 'undefined') {
        gsap.to(this.topperContainer.position, {
          y: topSurfaceY + (this.state.exploded ? 0.18 : 0),
          duration: 0.6,
          ease: 'power3.out',
        });
      } else {
        this.topperContainer.position.y = topSurfaceY;
      }
    }

    setTiers(count) {
      this.state.tiers = Math.max(1, Math.min(4, Number(count) || 3));
      this.updateCakeConfiguration({ animate: true });
    }

    setFinish(finishKey) {
      if (FINISH_PALETTES[finishKey]) {
        this.state.finish = finishKey;
        this.updateCakeConfiguration({ animate: true });
      }
    }

    setOrnament(ornamentKey) {
      if (this.ornamentGroups[ornamentKey]) {
        this.state.ornament = ornamentKey;
        this.updateCakeConfiguration({ animate: true });
      }
    }

    toggleExploded() {
      this.state.exploded = !this.state.exploded;
      this.updateCakeConfiguration({ animate: true });
      return this.state.exploded;
    }

    bindEvents() {
      const wrapper = this.canvas.parentElement;

      const onPointerDown = (x, y) => {
        this.isDragging = true;
        this.prevPointer.x = x;
        this.prevPointer.y = y;
      };

      const onPointerMove = (x, y) => {
        if (!this.isDragging) return;
        const dx = x - this.prevPointer.x;
        const dy = y - this.prevPointer.y;
        this.targetRotationY += dx * 0.011;
        this.targetRotationX = Math.max(-0.22, Math.min(0.42, this.targetRotationX + dy * 0.006));
        this.prevPointer.x = x;
        this.prevPointer.y = y;
      };

      const onPointerUp = () => {
        this.isDragging = false;
      };

      wrapper.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', onPointerUp);

      wrapper.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length === 1) {
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      wrapper.addEventListener(
        'touchmove',
        (e) => {
          if (e.touches.length === 1) {
            onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      window.addEventListener('touchend', onPointerUp);

      window.addEventListener('resize', () => {
        const w = wrapper.clientWidth || 540;
        const h = wrapper.clientHeight || 460;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      const dt = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      if (!this.isDragging) {
        this.targetRotationY += this.autoRotateSpeed;
      }

      // Smooth damping
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.08;
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.08;

      this.rootGroup.rotation.y = this.currentRotationY;
      this.rootGroup.rotation.x = this.currentRotationX;

      // Subtle floating motion
      this.rootGroup.position.y = -0.75 + Math.sin(elapsed * 1.5) * 0.04;

      // Animate gold dust particles
      if (this.particles) {
        const posAttr = this.particles.geometry.attributes.position;
        const speeds = this.particles.geometry.userData.speeds;
        for (let i = 0; i < posAttr.count; i++) {
          let y = posAttr.getY(i) + speeds[i] * dt;
          if (y > 3.6) y = -0.8;
          posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;
        this.particles.rotation.y = elapsed * 0.06;
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.LumiereCakeStudio3D = LumiereCakeStudio3D;
  window.LUMIERE_FINISH_PALETTES = FINISH_PALETTES;
})();

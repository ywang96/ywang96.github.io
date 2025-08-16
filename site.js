// Shared site scripts: year + dice
(function () {
  // Update copyright year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 3D cubes: make each instance rollable
  var diceButtons = document.querySelectorAll('.dice-button');
  if (!diceButtons.length) return;

  function randFace() {
    return Math.floor(Math.random() * 6) + 1; // pure uniform 1..6
  }

  // Map face number to orientation that brings that face to the FRONT.
  function orientationForFace(n) {
    switch (n) {
      case 1: return { x: 0,   y: 0   };
      case 2: return { x: 0,   y: -90 };
      case 3: return { x: 0,   y: 180 };
      case 4: return { x: 0,   y: 90  };
      case 5: return { x: -90, y: 0   }; // top -> front
      case 6: return { x: 90,  y: 0   }; // bottom -> front
      default: return { x: 0, y: 0 };
    }
  }

  diceButtons.forEach(function(btn){
    var cube = btn.querySelector('.cube');
    if (!cube) return;
    // Initialize stored angles to match the CSS resting pose
    if (!cube.dataset.rx) cube.dataset.rx = String(0);
    if (!cube.dataset.ry) cube.dataset.ry = String(0);
    if (!cube.dataset.rz) cube.dataset.rz = String(0);

    // Lighting: toggleable dynamic per-face brightness
    var SHADING_ENABLED = false;
    // Dynamic shading: compute per-face brightness based on final angles
    function shadeCube(cubeEl, rxDeg, ryDeg, rzDeg) {
      var faces = [
        { sel: '.face-1', n: [0, 0, 1] },   // front
        { sel: '.face-2', n: [1, 0, 0] },   // right
        { sel: '.face-3', n: [0, 0, -1] },  // back
        { sel: '.face-4', n: [-1, 0, 0] },  // left
        { sel: '.face-5', n: [0, 1, 0] },   // top
        { sel: '.face-6', n: [0, -1, 0] },  // bottom
      ];
      if (!SHADING_ENABLED) {
        faces.forEach(function(f){
          var el = cubeEl.querySelector(f.sel);
          if (el) el.style.filter = '';
        });
        return;
      }
      var toRad = Math.PI / 180;
      var cx = Math.cos(rxDeg * toRad), sx = Math.sin(rxDeg * toRad);
      var cy = Math.cos(ryDeg * toRad), sy = Math.sin(ryDeg * toRad);
      var cz = Math.cos(rzDeg * toRad), sz = Math.sin(rzDeg * toRad);
      // Important: CSS applies transforms right-to-left. For
      // transform: rotateX(a) rotateY(b) rotateZ(c), Z happens first,
      // then Y, then X. Apply rotations to the normal in that order.
      function rotate(v) {
        var x = v[0], y = v[1], z = v[2];
        // rotateZ(c)
        var xz = x * cz - y * sz;
        var yz = x * sz + y * cz;
        var zz = z;
        // rotateY(b)
        var xy = xz * cy + zz * sy;
        var yy = yz;
        var zy = -xz * sy + zz * cy;
        // rotateX(a)
        var xx = xy;
        var yx = yy * cx - zy * sx;
        var zx = yy * sx + zy * cx;
        return [xx, yx, zx];
      }
      // Light direction (from directly above), normalized
      var L = (function(){
        var v = [0, 1, 0];
        var len = Math.hypot(v[0], v[1], v[2]);
        return [v[0]/len, v[1]/len, v[2]/len];
      })();
      faces.forEach(function(f){
        var el = cubeEl.querySelector(f.sel);
        if (!el) return;
        var nWorld = rotate(f.n);
        var dot = Math.max(0, nWorld[0]*L[0] + nWorld[1]*L[1] + nWorld[2]*L[2]);
        // Map to brightness range
        var b = 0.85 + dot * 0.25; // 0.85..1.10 roughly
        el.style.filter = 'brightness(' + b.toFixed(3) + ')';
      });
    }
    // Initial shading (include wrapper tilt)
    var WRAP_X = -35, WRAP_Y = 45, WRAP_Z = 0;
    shadeCube(cube,
      parseFloat(cube.dataset.rx) + WRAP_X,
      parseFloat(cube.dataset.ry) + WRAP_Y,
      parseFloat(cube.dataset.rz) + WRAP_Z);
    var rolling = false;
    btn.addEventListener('click', function(){
      if (rolling) return;
      rolling = true;
      // Choose target immediately, expose it
      var target = randFace();
      cube.dataset.target = String(target);
      btn.setAttribute('aria-label', 'Rolling to ' + target);
      function orientationForFaceTop(n){
        switch (n) {
          case 1: return { x: 90,  y: 0,   z: 0   };   // front -> top
          case 2: return { x: 0,   y: 0,   z: 90  };   // right -> top
          case 3: return { x: -90, y: 0,   z: 0   };   // back -> top
          case 4: return { x: 0,   y: 0,   z: -90 };   // left -> top
          case 5: return { x: 0,   y: 0,   z: 0   };   // top -> top
          case 6: return { x: 180, y: 0,   z: 0   };   // bottom -> top
          default: return { x: 0, y: 0, z: 0 };
        }
      }
      var base = orientationForFaceTop(target);
      // Determine starting angles (persist between rolls)
      var startX = parseFloat(cube.dataset.rx || '0') || 0;
      var startY = parseFloat(cube.dataset.ry || '0') || 0;
      var startZ = parseFloat(cube.dataset.rz || '0') || 0;
      // Compute base target angles for the chosen face (TOP); keep Z as mapped
      var baseX = base.x;
      var baseY = base.y;
      var baseZ = base.z;
      // Compute forward deltas to the target top orientation and add full spins
      var extraX = 2 + Math.floor(Math.random() * 2); // 2..3
      var extraY = 2 + Math.floor(Math.random() * 2);
      var extraZ = 1 + Math.floor(Math.random() * 2);
      function forwardDelta(start, target){
        var mod = ((start % 360) + 360) % 360;
        var diff = ((target - mod) + 360) % 360; // in [0,360)
        return diff;
      }
      var endX = startX + extraX * 360 + forwardDelta(startX, baseX);
      var endY = startY + extraY * 360 + forwardDelta(startY, baseY);
      var endZ = startZ + extraZ * 360 + forwardDelta(startZ, baseZ);

      // Manual tween for smooth, guaranteed rotation
      var duration = 1100;
      var t0 = performance.now();
      var ease = function(u){ return 1 - Math.pow(1 - u, 3); }; // easeOutCubic
      cube.classList.add('rolling');
      var prevTransition = cube.style.transition;
      cube.style.transition = 'none';
      function frame(now){
        var u = Math.min(1, (now - t0) / duration);
        var e = ease(u);
        var curX = startX + (endX - startX) * e;
        var curY = startY + (endY - startY) * e;
        var curZ = startZ + (endZ - startZ) * e;
        cube.style.transform = 'rotateX(' + curX + 'deg) rotateY(' + curY + 'deg) rotateZ(' + curZ + 'deg)';
        // Update dynamic lighting during the roll (include wrapper tilt)
        shadeCube(cube, (curX + WRAP_X) % 360, (curY + WRAP_Y) % 360, (curZ + WRAP_Z) % 360);
        if (u < 1) {
          requestAnimationFrame(frame);
        } else {
          cube.classList.remove('rolling');
          btn.setAttribute('aria-label', 'Dice showing ' + target);
          // Normalize stored angles to the base orientation to avoid drift
          cube.dataset.rx = String(baseX);
          cube.dataset.ry = String(baseY);
          cube.dataset.rz = String(baseZ);
          cube.setAttribute('data-face', String(target));
          cube.style.transition = prevTransition;
          // Apply dynamic shading based on final angles modulo 360
          var fx = (baseX + WRAP_X) % 360, fy = (baseY + WRAP_Y) % 360, fz = (baseZ + WRAP_Z) % 360;
          shadeCube(cube, fx, fy, fz);
          rolling = false;
        }
      }
      requestAnimationFrame(frame);
    });
  });
})();

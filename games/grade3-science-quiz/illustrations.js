(() => {
  "use strict";

  const ink = "#49375e";
  const pink = "#f497ba";
  const lavender = "#c3a1ed";
  const sky = "#8dd5ee";
  const white = "#fff8fe";

  function path(ctx, points, fill, stroke = ink, width = 3) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }

  function oval(ctx, x, y, rx, ry, fill, stroke = null) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function round(ctx, x, y, w, h, radius, fill, stroke = null) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function withTransform(ctx, x, y, angle, draw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    draw();
    ctx.restore();
  }

  function sparkle(ctx, x, y, size, fill) {
    path(ctx, [[x, y-size], [x+size*.25, y-size*.25], [x+size, y], [x+size*.25, y+size*.25],
      [x, y+size], [x-size*.25, y+size*.25], [x-size, y], [x-size*.25, y-size*.25]], fill, null);
  }

  function paper(ctx, x, y) {
    path(ctx, [[x-13,y], [x-10,y-9], [x+3,y-12], [x+12,y-6], [x+14,y+5],
      [x+3,y+11], [x-8,y+9], [x-13,y]], "#f9efff");
    path(ctx, [[x-6,y+3],[x,y-5],[x+5,y+1]], null, "#b9a2cb", 2);
  }

  function beaker(ctx, x, y, color, residue = 0) {
    withTransform(ctx, x, y, 0, () => {
      path(ctx, [[-49,-52],[-43,53],[43,53],[49,-52],[-49,-52]], "#ffffffbb");
      path(ctx, [[-45,-10],[45,-10],[41,48],[-41,48]], color, null);
      oval(ctx, 0, -10, 45, 6, color, "#67628c");
      for (let i = 0; i < 3; i++) path(ctx, [[26,1+i*13],[42,1+i*13]], null, ink, 2);
      for (let i = 0; i < residue; i++) {
        oval(ctx, -31+(i*13)%60, 45-Math.floor(i/6)*6, 3, 2.5, "#fffdf8", "#6b5769");
      }
      path(ctx, [[-53,-52],[53,-52]], null, ink);
    });
  }

  function bag(ctx, x, y, expanded) {
    const side = expanded ? 47 : 28;
    withTransform(ctx, x, y, 0, () => {
      path(ctx, [[-18,-48],[-12,-26],[-side,38],[-side+6,55],
        [side-6,55],[side,38],[12,-26],[18,-48],[-18,-48]], "#f5ddf3", ink);
      path(ctx, [[-15,-28],[15,-28]], null, "#c26995", 5);
      path(ctx, [[-side+11,35],[-side+19,13]], null, "white", 4);
    });
  }

  function bubbles(ctx, x, y) {
    [9, 6, 4].forEach((size, i) => oval(ctx, x+i*10, y-i*18, size, size, "#e7faff", "#6594b5"));
  }

  function arrow(ctx, x, y, direction = 1) {
    path(ctx, [[x,y],[x+45*direction,y]], null, "#6864a8", 4);
    path(ctx, [[x+37*direction,y-7],[x+46*direction,y],[x+37*direction,y+7]], null, "#6864a8", 4);
  }

  function windmill(ctx, x, y, phase = 0) {
    round(ctx, x-3, y, 7, 89, 3, "#705994");
    withTransform(ctx, x, y, phase, () => {
      for (let i = 0; i < 4; i++) {
        withTransform(ctx, 0, 0, i * Math.PI / 2, () => {
          path(ctx, [[0,0],[5,-45],[42,-45],[30,-17],[0,0]], [pink, lavender, sky, "#ffce8a"][i]);
        });
      }
      oval(ctx, 0, 0, 7, 7, white, ink);
    });
  }

  function syringe(ctx, x, y, pushed, water = false, sealed = true) {
    withTransform(ctx, x, y, 0, () => {
      round(ctx, -66, -25, 156, 50, 8, "#fffeff", ink);
      round(ctx, 90, -6, 25, 12, 3, "#fffeff", ink);
      if (sealed) round(ctx, 115, -17, 13, 34, 4, pink, ink);
      round(ctx, -132+pushed, -4, 75, 8, 4, "#8d7aa5", ink);
      round(ctx, -137+pushed, -19, 10, 38, 4, lavender, ink);
      round(ctx, -67+pushed, -20, 154-pushed, 39, 5, water ? "#9ddcf5" : "#ede6fd");
      round(ctx, -68+pushed, -23, 12, 46, 4, "#7966a9", ink);
      for (let i = 0; i < 7; i++) path(ctx, [[-52+20*i, -24],[-52+20*i,-14]], null, ink, 2);
    });
  }

  function balloon(ctx, x, y, tall = false, angle = 0) {
    withTransform(ctx, x, y, angle, () => {
      oval(ctx, 0, 0, tall ? 26 : 41, 42, tall ? lavender : pink, ink);
      oval(ctx, -8, -16, 7, 13, "#fff4fcbb");
      path(ctx, [[0,39],[-6,49],[6,49]], pink);
      path(ctx, [[0,49],[-4,64],[3,76]], null, "#8a709f", 2);
    });
  }

  function sail(ctx, x, y, full = true) {
    withTransform(ctx, x, y, 0, () => {
      path(ctx, [[-67,47],[65,47],[46,70],[-48,70],[-67,47]], pink);
      path(ctx, [[0,-59],[0,47]], null, ink, 4);
      path(ctx, [[-3,-57],[-(full ? 52 : 17),34],[-3,34],[-3,-57]], lavender);
      path(ctx, [[3,-32],[full ? 44 : 13,35],[3,35],[3,-32]], "#fae6f3");
    });
  }

  function car(ctx, x, y) {
    round(ctx, x-42, y-26, 84, 27, 8, pink, ink);
    [x-26, x+26].forEach(cx => oval(ctx, cx, y+2, 11, 11, ink));
  }

  function grains(ctx, x, y, fine) {
    oval(ctx, x, y+35, 62, 13, "#e0edff", ink);
    for (let i = 0; i < (fine ? 42 : 9); i++) {
      const offset = (i*53)%86-43;
      const height = (i*31)%24;
      const size = fine ? 2 : 6;
      path(ctx, [[x+offset-size,y+32-height],[x+offset,y+29-height-size],
        [x+offset+size,y+32-height],[x+offset,y+34-height+size]], "#fffafd", "#8e79a0", 1);
    }
    oval(ctx, x, y, 70, 51, "#eadcfd26", "#937abc");
    path(ctx, [[x+56,y+33],[x+95,y+57]], null, "#937abc", 8);
  }

  function hero(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 600, 430);
    oval(ctx, 306, 224, 177, 169, "#ffffff73");
    oval(ctx, 298, 382, 148, 18, "#73398018");
    withTransform(ctx, 303, 227, -.07, () => {
      const dark = "#3d2c50";
      oval(ctx, 104, 106, 51, 11, dark);
      oval(ctx, 0, 122, 80, 42, dark);
      oval(ctx, -43, 149, 25, 14, dark);
      oval(ctx, 47, 149, 25, 14, dark);
      path(ctx, [[-100,-24],[-124,-126],[-49,-78]], dark, null);
      path(ctx, [[52,-83],[111,-137],[111,-30]], dark, null);
      path(ctx, [[-100,-50],[-111,-105],[-63,-73]], pink, null);
      path(ctx, [[62,-78],[101,-113],[100,-47]], pink, null);
      oval(ctx, 0, -10, 119, 91, dark);
      oval(ctx, 0, 10, 102, 66, "#ffeff8");
      oval(ctx, -36, 6, 8, 11, dark);
      oval(ctx, 36, 6, 8, 11, dark);
      oval(ctx, -37, 3, 2.5, 2.5, "#ffffff");
      oval(ctx, 35, 3, 2.5, 2.5, "#ffffff");
      oval(ctx, -58, 22, 13, 8, "#ffb6d0");
      oval(ctx, 58, 22, 13, 8, "#ffb6d0");
      oval(ctx, 0, 17, 6, 4, "#c76096");
      path(ctx, [[-10,25],[-6,29],[0,25],[6,29],[10,25]], null, dark, 2.5);
      path(ctx, [[-76,18],[-119,9]], null, "#9075a3", 3);
      path(ctx, [[-78,30],[-114,33]], null, "#9075a3", 3);
      path(ctx, [[76,18],[119,9]], null, "#9075a3", 3);
      path(ctx, [[78,30],[114,33]], null, "#9075a3", 3);
      oval(ctx, -45, 101, 19, 13, dark);
      beaker(ctx, 19, 113, "#ba8be3");
      oval(ctx, 66, 105, 17, 13, dark);
      oval(ctx, -23, 105, 17, 13, dark);
      withTransform(ctx, 74, -57, .31, () => {
        path(ctx, [[0,0],[-35,-19],[-36,20],[0,0],[35,20],[36,-19],[0,0]], pink);
        oval(ctx, 0, 0, 9, 10, "#f7c3dc", ink);
      });
    });
    sparkle(ctx, 135, 106, 29, "#ef97c3");
    sparkle(ctx, 445, 128, 23, "#8ecde9");
    sparkle(ctx, 470, 238, 32, "#caa4ee");
    sparkle(ctx, 120, 278, 20, "#b48ada");
    sparkle(ctx, 418, 57, 10, "#f5b5cc");
    bubbles(ctx, 322, 244);
  }

  function experiment(canvas, bank, question, active, elapsed = 0) {
    const ctx = canvas.getContext("2d");
    const step = active ?? -1;
    const second = question.id.endsWith("-25");
    ctx.clearRect(0, 0, 640, 216);
    oval(ctx, 320, 179, 218, 16, "#8066aa19");
    sparkle(ctx, 132, 59, 14, "#ef9ec7");
    sparkle(ctx, 500, 62, 11, "#b99ce1");
    if (bank.scene === "bag" && !second) {
      bag(ctx, 320, 111, step === 1);
    } else if (bank.scene === "bag") {
      if (step === 1) round(ctx, 190, 105, 260, 62, 17, "#b4e8f8", "#6ca9c1");
      round(ctx, 275, 117, 90, 30, 10, "#f6d476", ink);
      [295, 318, 347].forEach(x => oval(ctx, x, 131, 4, 2, "#ae7c50"));
      if (step === 1) bubbles(ctx, 335, 104);
    } else if (bank.scene === "cup" && second) {
      balloon(ctx, 320, 97, step === 1);
    } else if (bank.scene === "cup") {
      round(ctx, 190, 103, 260, 69, 14, "#b4e8f8", "#6ca9c1");
      withTransform(ctx, 321, 106, step === 1 ? .6 : 0, () => {
        path(ctx, [[-42,43],[-34,-48],[34,-48],[42,43]], "#ffffff85");
        paper(ctx, 0, -34);
        if (step === 1) path(ctx, [[-35,-19],[35,-42],[42,42],[-41,42]], "#70c7e6a0", null);
      });
      if (step === 1) bubbles(ctx, 395, 120);
    } else if (bank.scene === "wind" && !second) {
      windmill(ctx, 319, 92, [0, .35, .95][step+1] + elapsed * (step === 1 ? .013 : .004));
      if (step >= 0) arrow(ctx, 190, 83);
      if (step === 1) arrow(ctx, 180, 111);
    } else if (bank.scene === "wind") {
      syringe(ctx, 270, 106, step === 1 ? 35 : 0, false, false);
      path(ctx, [[401,103], [step === 1 ? 451 : 405,step === 1 ? 89 : 150]], null, pink, 7);
      if (step === 1) arrow(ctx, 421, 121);
    } else if (bank.scene === "syringe") {
      syringe(ctx, 323, 106, step === 0 ? 41 : 0, !second && step === 1);
    } else if (bank.scene === "balloon" && !second) {
      const x = step === 0 ? 265 : step === 1 ? 375 : 320;
      car(ctx, x, 158);
      balloon(ctx, x, 80, false, step === 0 ? -.8 : .8);
      if (step >= 0) arrow(ctx, x + (step === 0 ? -60 : 60), 156, step === 0 ? -1 : 1);
    } else if (bank.scene === "balloon") {
      sail(ctx, step === 0 ? 371 : 320, 91, step !== 1);
      if (step >= 0) arrow(ctx, 184, 90);
    } else if (bank.scene === "sail" && !second) {
      round(ctx, 164, 145, 312, 30, 13, "#95d5ef");
      sail(ctx, step === 1 ? 363 : 305, 74);
      if (step === 1) arrow(ctx, 205, 84);
    } else if (bank.scene === "sail") {
      const top = step === 1 ? 141 : 112;
      round(ctx, 250, top, 140, step === 1 ? 14 : 43, 14, sky, ink);
      round(ctx, 290, top-30, 58, 30, 5, pink, ink);
    } else if (bank.scene === "air" && !second) {
      path(ctx, [[180,164],[455,164]], null, "#8e79a0", 5);
      car(ctx, 314, 147);
      if (step === 0) [230, 251, 269].forEach((x, i) => oval(ctx, x, 128-i*9, 8+i*3, 7+i*3, "#9b92a7"));
    } else if (bank.scene === "air") {
      round(ctx, 263, 42, 115, 123, 15, white, ink);
      round(ctx, 287, 33, 65, 23, 8, lavender, ink);
      for (let i = 0; i < 3; i++) {
        oval(ctx, 287, 75+i*27, 5, 5, step === 1 ? "#ae69b8" : "#73c0dc");
        path(ctx, [[303,75+i*27],[353,75+i*27]], null, "#9d89ac", 3);
      }
    } else if (bank.scene === "grains") {
      grains(ctx, 312, 102, second ? step !== 1 : step === 1);
    } else if (bank.scene === "beaker" && second && step === 1) {
      beaker(ctx, 324, 124, "#a5d9ee", 0);
      path(ctx, [[269,43],[379,43],[324,87],[269,43]], "#fff4fd");
      for (let i = 0; i < 8; i++) oval(ctx, 303 + (i*13)%43, 54+i%3*4, 3, 2, "#846987");
    } else if (bank.scene === "heat" && !second) {
      beaker(ctx, 328, 104, step === 1 ? "#efbbd9" : "#afe3f6", step === 0 ? 14 : step === 1 ? 4 : 0);
      if (step === 1) {
        path(ctx, [[310,41],[303,32],[311,21],[306,13]], null, "#c5729a", 3);
        path(ctx, [[338,41],[333,32],[341,21],[336,13]], null, "#c5729a", 3);
      }
    } else if (bank.scene === "indicator") {
      const colors = second ? ["#c8a9e8", "#7ab9c2", "#ec92bb"] : ["#ec92bb", "#c8a9e8"];
      beaker(ctx, 320, 107, step < 0 ? "#d4b6ef" : colors[step]);
      path(ctx, [[320,24],[312,39],[320,48],[328,39],[320,24]], "#a67bc7");
    } else if (bank.scene === "solutions") {
      beaker(ctx, 320, 105, "#e4f7fd");
    } else {
      const residue = bank.scene === "salt" ? (second && step >= 0 ? 12 : step === 2 ? 12 : 0) : step === 1 || (bank.scene === "beaker" && second && step === 0) ? 9 : 0;
      beaker(ctx, 320, 105, "#aee1f3", residue);
      if (bank.scene === "heat" && second && step >= 0) {
        ctx.fillStyle = ink;
        ctx.font = "bold 21px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(step === 0 ? "20 秒" : "45 秒", 320, 193);
      }
    }
  }

  window.SCIENCE_ART = { hero, experiment };
})();

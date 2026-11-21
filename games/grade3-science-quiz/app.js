(() => {
  "use strict";

  const { banks, types, initialAnswer, complete, score, correctText, shuffledIndices } = window.SCIENCE_MODEL;
  const { hero, experiment } = window.SCIENCE_ART;
  const app = document.querySelector("#app");
  const units = [
    { id: 3, name: "奇妙的空氣", symbol: "☁", tone: "air" },
    { id: 4, name: "廚房裡的科學", symbol: "♢", tone: "kitchen" }
  ];
  const labels = {
    T: "判斷這句話是否正確。", S: "選一個最合適的答案。",
    O: "拖動卡片到位置，也能先點卡片，再點位置。",
    C: "拖動卡片到分類框，也能先點卡片，再點分類框。",
    P: "先點左邊的項目，再點右邊的答案。",
    D: "從選單選出合適的詞。", M: "勾選所有符合的答案。",
    X: "按按鈕操作，觀察後再選答案。"
  };
  const sequentialExperiments = new Set(["3-2-2-25", "4-1-2-25", "4-2-1-24", "4-2-1-25"]);
  const formatScore = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 1 }).format;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  let bank = null;
  let index = 0;
  let answer;
  let picked = null;
  let dragItem = null;
  let observed = [];
  let activeStep = null;
  let attempts = [];
  let submitted = false;
  let finished = false;
  let order = [];
  let resizeObserver;
  const current = () => bank?.questions[index];

  function bankUrl(id) {
    return id ? `?bank=${encodeURIComponent(id)}` : location.pathname;
  }

  function focusHeading() {
    document.querySelector("#view-title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function resetQuestion() {
    const q = current();
    answer = initialAnswer(q);
    picked = null;
    dragItem = null;
    observed = [];
    activeStep = null;
    submitted = false;
    order = shuffledIndices((q.type === "P" ? q.targets : q.options || q.items).length);
    if (q.type === "T") order = [0, 1];
    if (q.type === "O" && order.every((value, i) => value === i)) order.push(order.shift());
  }

  function showHome() {
    resizeObserver?.disconnect();
    bank = null;
    document.title = "貓咪科學室｜三年級自然";
    document.body.dataset.unit = "";
    app.innerHTML = `
      <section class="hero" aria-labelledby="view-title">
        <div class="hero-text">
          <p class="eyebrow">三年級自然 · 單元 3、4</p>
          <h1 id="view-title" tabindex="-1">貓咪科學室</h1>
          <p>今天想研究空氣，還是探索廚房？選一組開始挑戰！</p>
          <div class="hero-meta"><span>13 組題庫</span><span>每組 25 題</span><span>滿分 100 分</span></div>
        </div>
        <canvas class="mascot" width="600" height="430" role="img" aria-label="戴粉色蝴蝶結的小黑貓捧著紫色燒杯"></canvas>
      </section>
      <div class="bank-list">
        ${units.map(unit => `
          <section class="unit ${unit.tone}" aria-labelledby="unit-${unit.id}">
            <div class="unit-title">
              <span class="unit-icon" aria-hidden="true">${unit.symbol}</span>
              <div><p class="eyebrow">單元 ${unit.id}</p><h2 id="unit-${unit.id}">${unit.name}</h2></div>
            </div>
            <ul>${banks.filter(item => item.unit === unit.id).map(item => `
              <li><a class="bank-card" data-start="${item.id}" href="${bankUrl(item.id)}">
                <span class="bank-no">${item.id.slice(2)}</span>
                <span><strong>${escape(item.title)}</strong><small>${escape(item.intro)}</small></span>
                <span class="bank-arrow" aria-hidden="true">→</span>
              </a></li>`).join("")}</ul>
          </section>`).join("")}
      </div>`;
    hero(app.querySelector(".mascot"));
  }

  function start(selected) {
    bank = selected;
    index = 0;
    attempts = [];
    finished = false;
    document.body.dataset.unit = String(bank.unit);
    document.title = `${bank.title}｜貓咪科學室`;
    resetQuestion();
    showQuestion();
  }

  function showQuestion() {
    resizeObserver?.disconnect();
    const q = current();
    const earned = attempts.reduce((sum, attempt) => sum + attempt.points, 0);
    app.innerHTML = `
      <section class="quiz" aria-labelledby="view-title">
        <div class="quiz-top">
          <a class="text-link" href="${bankUrl()}" data-home>← 選擇題庫</a>
          <span>單元 ${bank.unit} · ${bank.id.slice(2)}</span>
        </div>
        <h1 id="view-title" tabindex="-1">${escape(bank.title)}</h1>
        <div class="progress-label"><span>第 ${index + 1} 題，共 25 題</span><span>目前得分 <strong>${formatScore(earned)}</strong> 分</span></div>
        <progress aria-label="已完成題數" max="25" value="${attempts.length}"></progress>
        <form id="quiz-form" class="question-card">
          <span class="type-tag">${types[q.type]}</span>
          <h2 id="question-title" tabindex="-1">${escape(q.prompt)}</h2>
          <p class="instructions">${labels[q.type]}</p>
          <div id="answer-area"></div>
          <div id="answer-feedback" hidden></div>
          <div class="quiz-actions">
            <button type="button" class="quiet" data-reset hidden>清除本題</button>
            <button type="submit" class="primary" id="submit-answer" disabled>確認答案</button>
            <button type="button" class="primary" data-next hidden>${index === 24 ? "查看結果" : "下一題"} <span aria-hidden="true">→</span></button>
          </div>
        </form>
        <div class="visually-hidden" id="announcement" aria-live="polite"></div>
      </section>`;
    renderControls();
  }

  function choices(q, enabled = true) {
    const multiple = q.type === "M";
    return `<fieldset class="choices" ${enabled ? "" : "disabled"}>
      <legend class="visually-hidden">${multiple ? "可複選" : "單選答案"}</legend>
      ${order.map((value, i) => {
        const checked = multiple ? answer.includes(value) : answer === value;
        const kind = multiple ? "checkbox" : "radio";
        const label = q.type === "T" ? (i ? "×" : "✓") : String.fromCharCode(65 + i);
        return `<label class="choice"><input type="${kind}" name="answer" value="${value}" ${checked ? "checked" : ""}><span class="choice-marker" aria-hidden="true">${label}</span><span>${escape(q.options[value])}</span></label>`;
      }).join("")}
    </fieldset>`;
  }

  function draggableItem(q, i, attachedNote = "") {
    return `<button type="button" class="move-chip" data-pick="${i}" draggable="true" aria-pressed="${picked === i}">
      ${escape(q.items[i])}${attachedNote ? `<small>${escape(attachedNote)}</small>` : ""}
    </button>`;
  }

  function ordering(q) {
    const free = order.filter(i => !answer.includes(i));
    return `
      <div class="chip-pool" aria-label="尚未排列的卡片">
        ${free.length ? free.map(i => draggableItem(q, i)).join("") : '<span class="muted">全部卡片已放入。</span>'}
      </div>
      <ol class="order-slots">
        ${answer.map((i, slot) => `<li><button type="button" class="drop order-slot" data-slot="${slot}" data-put="${slot}" ${i !== null ? `data-drag="${i}" draggable="true" aria-pressed="${picked === i}"` : ""}>
          <span class="slot-num">${slot + 1}</span><span>${i === null ? "放到這裡" : escape(q.items[i])}</span>
        </button></li>`).join("")}
      </ol>`;
  }

  function categories(q) {
    return `<div class="chip-pool" aria-label="要分類的卡片">
      ${order.map(i => draggableItem(q, i, answer[i] === null ? "" : `已放入 ${q.targets[answer[i]]}`)).join("")}
    </div>
    <div class="category-zones">
      ${q.targets.map((label, j) => {
        const inGroup = q.items.filter((_, i) => answer[i] === j);
        return `<button type="button" class="drop category" data-put="${j}">
          <strong>${escape(label)}</strong>
          <span>${inGroup.length ? inGroup.map(escape).join("、") : "放到這裡"}</span>
        </button>`;
      }).join("")}
    </div>`;
  }

  function matching(q) {
    return `<div class="match" aria-label="配對區">
      <canvas class="connections" aria-hidden="true"></canvas>
      <div class="match-column">${q.items.map((item, i) => `
        <button class="match-button match-left" type="button" data-pick="${i}" aria-pressed="${picked === i}">
          ${escape(item)}${answer[i] === null ? "" : `<small>已配對 ${escape(q.targets[answer[i]])}</small>`}
        </button>`).join("")}</div>
      <div class="match-column">${order.map(i => `
        <button class="match-button match-right${answer.includes(i) ? " used" : ""}" type="button" data-put="${i}">${escape(q.targets[i])}</button>`).join("")}
      </div>
    </div>`;
  }

  function drawConnections() {
    const canvas = app.querySelector(".connections");
    if (!canvas || current()?.type !== "P") return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    answer.forEach((value, i) => {
      if (value === null) return;
      const left = app.querySelector(`.match-left[data-pick="${i}"]`).getBoundingClientRect();
      const right = app.querySelector(`.match-right[data-put="${value}"]`).getBoundingClientRect();
      const y1 = left.top + left.height / 2 - box.top;
      const y2 = right.top + right.height / 2 - box.top;
      const x1 = left.right - box.left - 1;
      const x2 = right.left - box.left + 1;
      const middle = (x1+x2) / 2;
      ctx.strokeStyle = ["#8d60be", "#bd5b88", "#397e9f"][i % 3];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(middle, y1, middle, y2, x2, y2);
      ctx.stroke();
    });
  }

  function lab(q) {
    const ready = observed.length === q.steps.length;
    const sequential = sequentialExperiments.has(q.id);
    return `<div class="lab">
      <div class="lab-visual">
        <canvas id="experiment" width="640" height="216" aria-hidden="true"></canvas>
      </div>
      <div class="lab-buttons">
        ${q.steps.map(([step], i) => `
          <button class="lab-button" type="button" data-step="${i}" aria-pressed="${activeStep === i}" ${sequential && i > 0 && !observed.includes(i-1) ? "disabled" : ""}>
            ${observed.includes(i) ? '<span aria-hidden="true">✓ </span>' : ""}${escape(step)}
          </button>`).join("")}
      </div>
      ${observed.length ? `<ul class="observations" aria-label="觀察紀錄">${[...observed].sort((a,b) => a-b).map(i => `
        <li><strong>${escape(q.steps[i][0])}</strong>${escape(q.steps[i][1])}</li>`).join("")}</ul>` : ""}
      ${ready ? "" : `<p class="lab-note">看完 ${q.steps.length} 個操作結果，就能選答案。</p>`}
    </div>${choices(q, ready)}`;
  }

  function updateExperiment(q) {
    const canvas = document.querySelector("#experiment");
    const activeBank = bank;
    const step = activeStep;
    experiment(canvas, activeBank, q, step);
    if (q.id !== "3-2-1-24" || step === null || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const started = performance.now();
    function animate(now) {
      if (!canvas.isConnected) return;
      experiment(canvas, activeBank, q, step, now - started);
      if (now - started < 1600) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  function renderControls(focusSelector = null) {
    resizeObserver?.disconnect();
    const q = current();
    const area = document.querySelector("#answer-area");
    if (q.type === "O") area.innerHTML = ordering(q);
    else if (q.type === "C") area.innerHTML = categories(q);
    else if (q.type === "P") {
      area.innerHTML = matching(q);
      resizeObserver = new ResizeObserver(drawConnections);
      resizeObserver.observe(area.querySelector(".match"));
      drawConnections();
    } else if (q.type === "D") {
      area.innerHTML = `<label class="select-label" for="answer-select">選擇答案</label>
        <select id="answer-select" name="answer" class="dropdown"><option value="">請選一個</option>
          ${order.map(i => `<option value="${i}" ${i === answer ? "selected" : ""}>${escape(q.options[i])}</option>`).join("")}
        </select>`;
    } else if (q.type === "X") {
      area.innerHTML = lab(q);
      updateExperiment(q);
    } else area.innerHTML = choices(q);
    document.querySelector("[data-reset]").hidden = !q.items;
    updateSubmit();
    if (focusSelector) area.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function updateSubmit() {
    document.querySelector("#submit-answer").disabled = submitted || !complete(current(), answer, observed);
  }

  function announce(message) {
    document.querySelector("#announcement").textContent = message;
  }

  function place(target, source) {
    if (source === null || submitted) return;
    const q = current();
    if (q.type === "O") {
      const previous = answer.indexOf(source);
      if (previous >= 0 && previous !== target) answer[previous] = answer[target];
      answer[target] = source;
    } else {
      if (q.type === "P") {
        const previous = answer.indexOf(target);
        if (previous !== -1) answer[previous] = null;
      }
      answer[source] = target;
    }
    picked = null;
    renderControls(`[data-put="${target}"]`);
    const item = q.items[source];
    const placeName = q.type === "O" ? `第 ${target+1} 格` : q.targets[target];
    announce(`${item}已放到${placeName}`);
  }

  function submit() {
    const q = current();
    if (!q || submitted || !complete(q, answer, observed)) return;
    submitted = true;
    const points = score(q, answer);
    const full = points === 4;
    attempts.push({ q, points });
    app.querySelector("progress").value = attempts.length;
    app.querySelector(".progress-label strong").textContent = formatScore(attempts.reduce((sum, item) => sum + item.points, 0));
    const area = document.querySelector("#answer-area");
    area.querySelectorAll("button,input,select").forEach(control => { control.disabled = true; });
    area.querySelectorAll("[draggable]").forEach(element => { element.draggable = false; });
    const feedback = document.querySelector("#answer-feedback");
    feedback.hidden = false;
    feedback.className = `feedback ${full ? "is-correct" : ""}`;
    feedback.tabIndex = -1;
    feedback.innerHTML = `<strong>${full ? "答對了！" : points ? "答對一部分" : "再看一下"} · ${formatScore(points)} / 4 分</strong>
      <p>${escape(q.explanation)}</p>${full ? "" : `<p><b>參考答案</b> ${escape(correctText(q))}</p>`}`;
    document.querySelector("[data-reset]").hidden = true;
    document.querySelector("#submit-answer").hidden = true;
    document.querySelector("[data-next]").hidden = false;
    feedback.focus();
  }

  function showResults() {
    resizeObserver?.disconnect();
    finished = true;
    const total = attempts.reduce((sum, item) => sum + item.points, 0);
    const review = attempts.filter(item => item.points < 4);
    app.innerHTML = `
      <section class="result" aria-labelledby="view-title">
        <div class="result-hero">
          <div>
            <p class="eyebrow">${escape(bank.title)}</p>
            <h1 id="view-title" tabindex="-1">挑戰完成！</h1>
            <p class="result-score">${formatScore(total)} <span>/ 100 分</span></p>
            <p>完全答對 ${25 - review.length} 題，共 25 題。</p>
          </div>
          <canvas class="result-mascot" width="600" height="430" aria-hidden="true"></canvas>
        </div>
        <div class="result-actions">
          <button type="button" class="primary" data-replay>再挑戰一次</button>
          <a class="quiet" data-home href="${bankUrl()}">換一組題庫</a>
        </div>
        <section class="review" aria-labelledby="review-title">
          <h2 id="review-title">錯題回顧</h2>
          ${review.length ? review.map(({q, points}) => `<details>
            <summary><span>第 ${bank.questions.indexOf(q) + 1} 題 · ${formatScore(points)} / 4 分</span><span>${escape(q.prompt)}</span></summary>
            <p><b>參考答案</b> ${escape(correctText(q))}</p>
            <p>${escape(q.explanation)}</p>
          </details>`).join("") : "<p>這一組全對了！</p>"}
        </section>
      </section>`;
    hero(app.querySelector(".result-mascot"));
    focusHeading();
  }

  function goHome() {
    if (bank && !finished && (attempts.length || complete(current(), answer, observed))) {
      if (!confirm("回到題庫選單會結束這次挑戰。要返回嗎？")) return;
    }
    history.pushState(null, "", bankUrl());
    showHome();
    focusHeading();
  }

  function route() {
    const requested = new URLSearchParams(location.search).get("bank");
    const selected = banks.find(item => item.id === requested);
    if (selected) start(selected);
    else showHome();
  }

  document.addEventListener("click", event => {
    const control = event.target.closest("[data-start],[data-home],[data-reset],[data-next],[data-replay],[data-pick],[data-put],[data-step]");
    if (!control) return;
    if (control instanceof HTMLAnchorElement && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    if (control.hasAttribute("data-home")) {
      event.preventDefault();
      if (bank) goHome();
      return;
    }
    if (control.dataset.start) {
      event.preventDefault();
      history.pushState(null, "", bankUrl(control.dataset.start));
      start(banks.find(item => item.id === control.dataset.start));
      focusHeading();
      return;
    }
    if (control.hasAttribute("data-replay")) { start(bank); focusHeading(); return; }
    if (control.hasAttribute("data-next")) {
      if (!submitted) return;
      if (index === 24) showResults();
      else {
        index++;
        resetQuestion();
        showQuestion();
        document.querySelector("#question-title").focus();
        window.scrollTo(0, 0);
      }
      return;
    }
    if (submitted) return;
    if (control.hasAttribute("data-reset")) {
      answer = initialAnswer(current());
      picked = null;
      renderControls();
      document.querySelector("[data-reset]").focus();
      announce("已清除這題的答案");
    } else if (control.dataset.step !== undefined) {
      activeStep = Number(control.dataset.step);
      if (!observed.includes(activeStep)) observed.push(activeStep);
      renderControls(`[data-step="${activeStep}"]`);
      announce(current().steps[activeStep][1]);
    } else if (control.dataset.pick !== undefined) {
      const value = Number(control.dataset.pick);
      picked = picked === value ? null : value;
      renderControls(`[data-pick="${value}"]`);
      if (picked !== null) announce(`已選擇${current().items[picked]}`);
    } else if (control.dataset.put !== undefined) {
      const target = Number(control.dataset.put);
      if (picked !== null) place(target, picked);
      else if (control.dataset.slot !== undefined && answer[target] !== null) {
        picked = answer[target];
        renderControls(`[data-slot="${target}"]`);
        announce(`已選擇${current().items[picked]}`);
      } else {
        announce("請先點選要移動或配對的卡片");
      }
    }
  });

  app.addEventListener("change", event => {
    const control = event.target;
    if (control.name !== "answer" || submitted) return;
    const value = Number(control.value);
    if (control.type === "checkbox") {
      answer = control.checked ? [...answer, value] : answer.filter(item => item !== value);
    } else answer = control.value === "" ? null : value;
    updateSubmit();
  });

  app.addEventListener("submit", event => {
    if (event.target.id !== "quiz-form") return;
    event.preventDefault();
    submit();
  });

  app.addEventListener("dragstart", event => {
    const control = event.target.closest("[draggable=true]");
    if (!control || submitted || !event.dataTransfer) return;
    dragItem = Number(control.dataset.pick ?? control.dataset.drag);
    event.dataTransfer.setData("text/plain", String(dragItem));
    event.dataTransfer.effectAllowed = "move";
  });

  app.addEventListener("dragover", event => {
    const target = event.target.closest(".drop");
    if (!target || dragItem === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    target.classList.add("drag-over");
  });

  app.addEventListener("dragleave", event => {
    const target = event.target.closest(".drop");
    if (target && !target.contains(event.relatedTarget)) target.classList.remove("drag-over");
  });

  app.addEventListener("drop", event => {
    const target = event.target.closest(".drop");
    if (!target || dragItem === null) return;
    event.preventDefault();
    place(Number(target.dataset.put), dragItem);
    dragItem = null;
  });

  app.addEventListener("dragend", () => {
    dragItem = null;
    app.querySelectorAll(".drag-over").forEach(target => target.classList.remove("drag-over"));
  });

  window.addEventListener("popstate", () => { route(); focusHeading(); });
  route();
})();

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ui = Object.fromEntries([
    "notice", "setupView", "loginView", "dashboardView", "boardView", "loginForm", "emailInput",
    "accountLabel", "signOutButton", "newBoardButton", "boardList", "backButton", "copyLinkButton",
    "presentButton", "boardTitle", "boardDescription", "ownerActions", "editBoardButton",
    "rotateLinkButton", "deleteBoardButton", "postCount", "newPostButton", "postList",
    "boardDialog", "boardForm", "boardDialogTitle", "boardNameInput", "boardDescriptionInput",
    "postDialog", "postForm", "postDialogTitle", "postTitleInput", "postBodyInput", "postImageInput",
    "imageStatus", "removeImageButton", "savePostButton", "presentation", "slideBoardTitle",
    "slideContent", "slideCounter", "closePresentationButton", "previousSlideButton", "nextSlideButton"
  ].map((id) => [id, $(id)]));
  const config = window.BOARDS_CONFIG || {};
  const state = { client: null, user: null, boards: [], board: null, posts: [], ownerView: false,
    editingBoardId: null, editingPostId: null, removeImage: false, slideIndex: 0, touchX: null };
  const maxFileBytes = 5 * 1024 * 1024;

  function show(view) {
    for (const name of ["setupView", "loginView", "dashboardView", "boardView"]) ui[name].hidden = name !== view;
  }
  function message(text, isError = false) {
    ui.notice.textContent = text;
    ui.notice.classList.toggle("error", isError);
    ui.notice.hidden = !text;
    if (text) ui.notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function errorText(error) { return error && error.message ? error.message : "發生未預期的錯誤，請稍後重試。"; }
  function el(tag, className, textValue) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  }
  function button(label, className, handler, disabled = false) {
    const node = el("button", className, label);
    node.type = "button";
    node.disabled = disabled;
    node.addEventListener("click", handler);
    return node;
  }
  function imageUrl(path) {
    return state.client.storage.from("board-images").getPublicUrl(path).data.publicUrl;
  }
  function shareUrl(token) {
    const url = new URL(window.location.pathname, window.location.href);
    url.searchParams.set("share", token);
    return url.href;
  }
  async function copyText(value) {
    try { await navigator.clipboard.writeText(value); }
    catch (_) {
      const input = el("textarea");
      input.value = value;
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      if (!copied) throw new Error("無法自動複製，請手動複製網址列中的連結。");
    }
  }

  async function init() {
    bindEvents();
    if (!config.url || !config.publishableKey || !window.supabase) {
      show("setupView");
      if (config.url && !window.supabase) message("登入元件載入失敗，請檢查網路後重新整理。", true);
      return;
    }
    try { state.client = window.supabase.createClient(config.url, config.publishableKey); }
    catch (error) { show("setupView"); message(errorText(error), true); return; }
    const token = new URLSearchParams(window.location.search).get("share");
    if (token) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
        show("boardView"); renderMissingBoard(); return;
      }
      await loadSharedBoard(token);
      return;
    }
    try {
      const { data, error } = await state.client.auth.getSession();
      if (error) throw error;
      if (data.session) await enterOwner(data.session.user);
      else show("loginView");
    } catch (error) { show("loginView"); message("登入狀態無法讀取：" + errorText(error), true); }
  }

  async function enterOwner(user) {
    const { data, error } = await state.client.rpc("is_board_owner");
    if (error) throw error;
    if (!data) {
      await state.client.auth.signOut();
      show("loginView");
      message("這個帳號尚未獲得看板編輯權限。", true);
      return;
    }
    state.user = user;
    ui.accountLabel.textContent = user.email || "已登入";
    ui.accountLabel.hidden = false;
    ui.signOutButton.hidden = false;
    await loadDashboard();
  }
  async function loadDashboard() {
    const { data, error } = await state.client.from("boards").select("id,title,description,share_token,created_at").order("created_at", { ascending: false });
    if (error) throw error;
    state.boards = data || [];
    state.board = null;
    state.posts = [];
    state.ownerView = true;
    window.history.replaceState(null, "", window.location.pathname);
    renderDashboard();
    show("dashboardView");
  }
  function renderDashboard() {
    ui.boardList.replaceChildren();
    if (!state.boards.length) {
      ui.boardList.appendChild(el("div", "empty", "還沒有看板。按「新增看板」開始整理你的第一則內容。"));
      return;
    }
    for (const board of state.boards) {
      const card = button("", "board-card", () => loadOwnerBoard(board.id).catch((error) => message("無法開啟看板：" + errorText(error), true)));
      card.appendChild(el("span", "eyebrow", "BOARD"));
      card.appendChild(el("h2", "", board.title));
      if (board.description) card.appendChild(el("p", "", board.description));
      card.appendChild(el("span", "meta", "開啟並編輯 →"));
      ui.boardList.appendChild(card);
    }
  }

  async function loadOwnerBoard(id) {
    const board = state.boards.find((item) => item.id === id);
    if (!board) throw new Error("找不到看板。");
    const { data, error } = await state.client.from("board_posts")
      .select("id,board_id,title,body,image_path,sort_order,created_at")
      .eq("board_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    state.board = board;
    state.posts = data || [];
    state.ownerView = true;
    message("");
    renderBoard();
    show("boardView");
  }
  async function loadSharedBoard(token) {
    try {
      const { data, error } = await state.client.rpc("get_shared_board", { p_token: token });
      if (error) throw error;
      if (!data || !data.board) { show("boardView"); renderMissingBoard(); return; }
      state.board = data.board;
      state.posts = data.posts || [];
      state.ownerView = false;
      renderBoard();
      show("boardView");
    } catch (error) { show("boardView"); renderMissingBoard(); message("看板目前無法載入：" + errorText(error), true); }
  }
  function renderMissingBoard() {
    state.board = null;
    ui.boardTitle.textContent = "找不到看板";
    ui.boardDescription.textContent = "分享連結可能已更新，請向分享者索取新的連結。";
    ui.postList.replaceChildren();
    ui.postCount.textContent = "";
    ui.backButton.hidden = true;
    ui.copyLinkButton.hidden = true;
    ui.presentButton.hidden = true;
    ui.ownerActions.hidden = true;
    ui.newPostButton.hidden = true;
  }
  function renderBoard() {
    const board = state.board;
    document.title = board.title + "｜藍老師工作室看板";
    ui.boardTitle.textContent = board.title;
    ui.boardDescription.textContent = board.description || "";
    ui.backButton.hidden = !state.ownerView;
    ui.ownerActions.hidden = !state.ownerView;
    ui.newPostButton.hidden = !state.ownerView;
    ui.copyLinkButton.hidden = !board.share_token;
    ui.presentButton.disabled = state.posts.length === 0;
    ui.postCount.textContent = state.posts.length;
    ui.postList.replaceChildren();
    if (!state.posts.length) {
      ui.postList.appendChild(el("div", "empty", state.ownerView ? "這塊看板還沒有貼文，按「新增貼文」開始。" : "這塊看板目前沒有貼文。"));
      return;
    }
    state.posts.forEach((post, index) => {
      const card = el("article", "post-card");
      if (post.image_path) {
        const img = el("img");
        img.src = imageUrl(post.image_path);
        img.alt = post.title ? post.title + "的圖片" : "貼文圖片";
        img.loading = "lazy";
        card.appendChild(img);
      }
      const body = el("div", "post-body");
      if (post.title) body.appendChild(el("h3", "", post.title));
      if (post.body) body.appendChild(el("p", "", post.body));
      card.appendChild(body);
      if (state.ownerView) {
        const actions = el("div", "post-actions");
        const order = el("div", "order");
        const up = button("↑", "button light", () => movePost(post.id, -1), index === 0);
        const down = button("↓", "button light", () => movePost(post.id, 1), index === state.posts.length - 1);
        up.setAttribute("aria-label", "將第 " + (index + 1) + " 則貼文上移");
        down.setAttribute("aria-label", "將第 " + (index + 1) + " 則貼文下移");
        order.appendChild(up);
        order.appendChild(down);
        actions.appendChild(order);
        actions.appendChild(button("編輯", "button light small", () => openPostDialog(post)));
        actions.appendChild(button("刪除", "button danger small", () => deletePost(post)));
        card.appendChild(actions);
      }
      ui.postList.appendChild(card);
    });
  }

  function openBoardDialog(board = null) {
    state.editingBoardId = board ? board.id : null;
    ui.boardDialogTitle.textContent = board ? "編輯看板" : "新增看板";
    ui.boardNameInput.value = board ? board.title : "";
    ui.boardDescriptionInput.value = board ? board.description || "" : "";
    ui.boardDialog.showModal();
    ui.boardNameInput.focus();
  }
  async function saveBoard(event) {
    event.preventDefault();
    const title = ui.boardNameInput.value.trim();
    if (!title) { ui.boardNameInput.focus(); return; }
    const values = { title, description: ui.boardDescriptionInput.value.trim() };
    const submit = ui.boardForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      let result;
      if (state.editingBoardId) result = await state.client.from("boards").update(values).eq("id", state.editingBoardId).select("id,title,description,share_token,created_at").single();
      else result = await state.client.from("boards").insert({ ...values, owner_id: state.user.id }).select("id,title,description,share_token,created_at").single();
      if (result.error) throw result.error;
      ui.boardDialog.close();
      if (state.editingBoardId) {
        state.boards = state.boards.map((board) => board.id === result.data.id ? result.data : board);
        state.board = result.data;
        renderBoard();
      } else {
        state.boards.unshift(result.data);
        renderDashboard();
        await loadOwnerBoard(result.data.id);
      }
      message("看板已儲存。");
    } catch (error) { window.alert("看板儲存失敗：" + errorText(error)); }
    finally { submit.disabled = false; }
  }
  async function rotateLink() {
    if (!window.confirm("確定更新分享連結？舊連結會立即失效。")) return;
    const token = crypto.randomUUID();
    const { data, error } = await state.client.from("boards").update({ share_token: token }).eq("id", state.board.id).select("share_token").single();
    if (error) { message("更新連結失敗：" + errorText(error), true); return; }
    state.board.share_token = data.share_token;
    message("分享連結已更新，舊連結已失效。");
  }
  async function deleteBoard() {
    if (!window.confirm("確定永久刪除整塊看板和所有貼文？此動作無法復原。")) return;
    const paths = state.posts.map((post) => post.image_path).filter(Boolean);
    const { error } = await state.client.from("boards").delete().eq("id", state.board.id);
    if (error) { message("刪除看板失敗：" + errorText(error), true); return; }
    let cleanupError = null;
    if (paths.length) cleanupError = (await state.client.storage.from("board-images").remove(paths)).error;
    await loadDashboard();
    message(cleanupError ? "看板已刪除，但部分圖片清理失敗，請在 Supabase 後台檢查。" : "看板已刪除。", !!cleanupError);
  }

  function openPostDialog(post = null) {
    state.editingPostId = post ? post.id : null;
    state.removeImage = false;
    ui.postDialogTitle.textContent = post ? "編輯貼文" : "新增貼文";
    ui.postTitleInput.value = post ? post.title || "" : "";
    ui.postBodyInput.value = post ? post.body || "" : "";
    ui.postImageInput.value = "";
    ui.imageStatus.textContent = post && post.image_path ? "目前已有一張圖片。選擇新圖片可替換。" : "";
    ui.removeImageButton.hidden = !(post && post.image_path);
    ui.removeImageButton.textContent = "移除現有圖片";
    ui.postDialog.showModal();
    ui.postTitleInput.focus();
  }
  async function resizeImage(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("只接受 JPG、PNG、WebP 圖片。");
    if (file.size > maxFileBytes) throw new Error("原始圖片超過 5 MB，請先縮小後再上傳。");
    const source = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1600 / Math.max(source.width, source.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("這台裝置無法處理圖片。");
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
      if (!blob || blob.type !== "image/webp") throw new Error("這個瀏覽器無法轉換 WebP 圖片。");
      if (blob.size > maxFileBytes) throw new Error("壓縮後圖片仍超過 5 MB，請改用較小的圖片。");
      return blob;
    } finally { source.close(); }
  }
  async function savePost(event) {
    event.preventDefault();
    const previous = state.posts.find((post) => post.id === state.editingPostId);
    const title = ui.postTitleInput.value.trim();
    const body = ui.postBodyInput.value.trim();
    const file = ui.postImageInput.files[0];
    const retainedImage = previous && !state.removeImage ? previous.image_path : null;
    if (!title && !body && !file && !retainedImage) { ui.imageStatus.textContent = "請填寫標題、文字內容，或選擇一張圖片。"; return; }
    ui.savePostButton.disabled = true;
    ui.imageStatus.textContent = file ? "正在處理與上傳圖片…" : "正在儲存…";
    let uploadedPath = null;
    try {
      if (file) {
        const blob = await resizeImage(file);
        uploadedPath = state.user.id + "/" + crypto.randomUUID() + ".webp";
        const upload = await state.client.storage.from("board-images").upload(uploadedPath, blob, { contentType: "image/webp", upsert: false });
        if (upload.error) throw upload.error;
      }
      const image_path = uploadedPath || retainedImage || null;
      const values = { title, body, image_path };
      let result;
      if (previous) result = await state.client.from("board_posts").update(values).eq("id", previous.id).select("id,board_id,title,body,image_path,sort_order,created_at").single();
      else result = await state.client.from("board_posts").insert({ ...values, board_id: state.board.id, sort_order: state.posts.reduce((max, post) => Math.max(max, post.sort_order), 0) + 1 }).select("id,board_id,title,body,image_path,sort_order,created_at").single();
      if (result.error) throw result.error;
      ui.postDialog.close();
      const oldPath = previous && previous.image_path;
      if (previous) state.posts = state.posts.map((post) => post.id === previous.id ? result.data : post);
      else state.posts.push(result.data);
      renderBoard();
      if (oldPath && oldPath !== image_path) {
        const cleanup = await state.client.storage.from("board-images").remove([oldPath]);
        if (cleanup.error) { message("貼文已儲存，但舊圖片清理失敗，請在 Supabase 後台檢查。", true); return; }
      }
      message("貼文已儲存。");
    } catch (error) {
      if (uploadedPath) await state.client.storage.from("board-images").remove([uploadedPath]);
      ui.imageStatus.textContent = "儲存失敗：" + errorText(error) + "。內容仍在表單中，可重試。";
    } finally { ui.savePostButton.disabled = false; }
  }
  async function deletePost(post) {
    if (!window.confirm("確定刪除這則貼文？")) return;
    const { error } = await state.client.from("board_posts").delete().eq("id", post.id);
    if (error) { message("刪除貼文失敗：" + errorText(error), true); return; }
    state.posts = state.posts.filter((item) => item.id !== post.id);
    renderBoard();
    const cleanup = post.image_path ? await state.client.storage.from("board-images").remove([post.image_path]) : null;
    message(cleanup && cleanup.error ? "貼文已刪除，但圖片清理失敗，請在 Supabase 後台檢查。" : "貼文已刪除。", !!(cleanup && cleanup.error));
  }
  async function movePost(id, direction) {
    const { error } = await state.client.rpc("move_board_post", { p_post_id: id, p_direction: direction });
    if (error) { message("調整順序失敗：" + errorText(error), true); return; }
    await loadOwnerBoard(state.board.id);
  }

  function openPresentation() {
    if (!state.posts.length) return;
    state.slideIndex = 0;
    ui.presentation.hidden = false;
    document.body.style.overflow = "hidden";
    renderSlide();
    ui.closePresentationButton.focus();
    if (ui.presentation.requestFullscreen) ui.presentation.requestFullscreen().catch(() => {});
  }
  function closePresentation() {
    ui.presentation.hidden = true;
    document.body.style.overflow = "";
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ui.presentButton.focus();
  }
  function renderSlide() {
    const post = state.posts[state.slideIndex];
    if (!post) return;
    ui.slideBoardTitle.textContent = state.board.title;
    ui.slideCounter.textContent = (state.slideIndex + 1) + " / " + state.posts.length;
    ui.previousSlideButton.disabled = state.slideIndex === 0;
    ui.nextSlideButton.disabled = state.slideIndex === state.posts.length - 1;
    ui.slideContent.classList.toggle("image-only", !!post.image_path && !post.title && !post.body);
    ui.slideContent.replaceChildren();
    if (post.image_path) {
      const img = el("img"); img.src = imageUrl(post.image_path); img.alt = post.title || "貼文圖片";
      ui.slideContent.appendChild(img);
    }
    if (post.title) ui.slideContent.appendChild(el("h2", "", post.title));
    if (post.body) ui.slideContent.appendChild(el("p", "", post.body));
  }
  function stepSlide(step) {
    const next = state.slideIndex + step;
    if (next < 0 || next >= state.posts.length) return;
    state.slideIndex = next;
    renderSlide();
  }

  function bindEvents() {
    ui.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = ui.loginForm.querySelector('[type="submit"]'); submit.disabled = true;
      try {
        const { error } = await state.client.auth.signInWithOtp({ email: ui.emailInput.value.trim(), options: { shouldCreateUser: false, emailRedirectTo: new URL(window.location.pathname, window.location.href).href } });
        if (error) throw error;
        message("登入連結已寄出。請到信箱點開連結，再返回這個頁面。", false);
      } catch (error) { message("寄送登入連結失敗：" + errorText(error), true); }
      finally { submit.disabled = false; }
    });
    ui.signOutButton.addEventListener("click", async () => {
      const { error } = await state.client.auth.signOut();
      if (error) { message("登出失敗：" + errorText(error), true); return; }
      state.user = null; ui.accountLabel.hidden = true; ui.signOutButton.hidden = true;
      window.history.replaceState(null, "", window.location.pathname); show("loginView"); message("已登出。");
    });
    ui.newBoardButton.addEventListener("click", () => openBoardDialog());
    ui.backButton.addEventListener("click", () => loadDashboard().catch((error) => message("無法載入看板：" + errorText(error), true)));
    ui.boardForm.addEventListener("submit", saveBoard);
    ui.editBoardButton.addEventListener("click", () => openBoardDialog(state.board));
    ui.rotateLinkButton.addEventListener("click", rotateLink);
    ui.deleteBoardButton.addEventListener("click", deleteBoard);
    ui.copyLinkButton.addEventListener("click", async () => {
      try { await copyText(shareUrl(state.board.share_token)); message("分享連結已複製。持有連結的人可以觀看這塊看板。"); }
      catch (error) { message(errorText(error), true); }
    });
    ui.newPostButton.addEventListener("click", () => openPostDialog());
    ui.postForm.addEventListener("submit", savePost);
    ui.removeImageButton.addEventListener("click", () => {
      state.removeImage = !state.removeImage;
      ui.removeImageButton.textContent = state.removeImage ? "保留現有圖片" : "移除現有圖片";
      ui.imageStatus.textContent = state.removeImage ? "儲存後會移除原圖；也可以選擇新圖片替換。" : "目前已有一張圖片。";
    });
    document.querySelectorAll("[data-close-dialog]").forEach((node) => node.addEventListener("click", () => node.closest("dialog").close()));
    ui.presentButton.addEventListener("click", openPresentation);
    ui.closePresentationButton.addEventListener("click", closePresentation);
    ui.previousSlideButton.addEventListener("click", () => stepSlide(-1));
    ui.nextSlideButton.addEventListener("click", () => stepSlide(1));
    document.addEventListener("keydown", (event) => {
      if (ui.presentation.hidden) return;
      if (event.key === "Escape") closePresentation();
      else if (event.key === "ArrowRight") { event.preventDefault(); stepSlide(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); stepSlide(-1); }
    });
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && !ui.presentation.hidden) closePresentation(); });
    ui.slideContent.addEventListener("touchstart", (event) => { state.touchX = event.changedTouches[0].screenX; }, { passive: true });
    ui.slideContent.addEventListener("touchend", (event) => {
      if (state.touchX === null) return;
      const delta = event.changedTouches[0].screenX - state.touchX;
      if (Math.abs(delta) > 50) stepSlide(delta < 0 ? 1 : -1);
      state.touchX = null;
    }, { passive: true });
  }
  init();
})();

# 藍老師看板：Supabase 設定

看板頁面在 `boards/index.html`，以 GitHub Pages 發布。文字、看板、登入狀態和圖片由獨立的 Supabase 專案提供。完成以下設定前，頁面會顯示「尚待連線」。

## 一次性設定

1. 在 [Supabase](https://supabase.com/dashboard) 建立**專用** Free 專案。這個專案只給此看板使用。
2. 在 SQL Editor 執行 `supabase/setup.sql`。它會建立看板、貼文、擁有者名單、圖片儲存桶及權限規則。
3. 在 Authentication → Users 建立或邀請你的**唯一**編輯帳號，完成信箱確認，複製該帳號的 User UID。
4. 回到 SQL Editor 執行下列指令，把 UUID 換成剛才複製的 User UID：

   ```sql
   insert into public.board_owners (user_id)
   values ('YOUR_USER_UUID'::uuid)
   on conflict (user_id) do nothing;
   ```

5. 在 Authentication → Settings / Sign In 設定中關閉 **Allow new users to sign up**，保留 Email 登入。看板登入表單已設定 `shouldCreateUser: false`。
6. 在 Authentication → URL Configuration 將 Site URL 設為 `https://garrolan.github.io/lan-teacher-studio/boards/`，並把同一網址加入 Redirect URLs。若要在本機測試登入，再加入本機測試網址。
7. 從 Project Settings → API 取得 **Project URL** 和 **publishable key**，填入 `boards/config.js` 的 `url`、`publishableKey`。這兩項是瀏覽器用的公開值；**不可填 secret key 或 service_role key**。
8. 把網站更新發布至 GitHub Pages，開啟 `https://garrolan.github.io/lan-teacher-studio/boards/`，以擁有者信箱登入。

## 驗收

- 登入後建立看板，新增純文字、純圖片及圖文貼文；換裝置登入後內容仍在。
- 複製分享連結，用未登入視窗開啟；可看板及逐頁簡報，不能新增、修改、刪除。
- 更新分享連結後，舊連結顯示「找不到看板」，新連結可用。
- 刪除圖片、貼文或看板後，確認 Supabase Storage 中的圖片已清除。
- 圖片上傳失敗時，表單中的文字仍在，且資料庫沒有產生空白貼文。

## 使用限制

每則貼文最多一張 JPG、PNG 或 WebP 圖片，原始檔最多 5 MB。頁面會將長邊超過 1600 像素的圖片縮小，再轉成 WebP 儲存。看板的分享連結不列於網站清單，但取得連結的人都能觀看；請勿放入需要登入保護的資料。Supabase Free 容量、傳輸與閒置暫停條件以其現行方案為準。

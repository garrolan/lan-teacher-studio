# 藍老師工作室｜教學・行政・AI 工具箱

這是一個準備部署到 GitHub Pages 的靜態網站框架。

預計公開網址：

https://garrolan.github.io/lan-teacher-studio/

## 這個網站放什麼

- 工具
- 簡報
- 影片
- 音樂
- 網站
- 教學遊戲
- 行政常用工具與流程
- 相關連結

## 主要檔案

- `index.html`：首頁。
- `tools.html`：工具頁。
- `presentations.html`：簡報頁。
- `videos.html`：影片頁。
- `music.html`：音樂頁。
- `websites.html`：網站頁。
- `games.html`：教學遊戲頁。
- `links.html`：相關連結頁。
- `assets/items.js`：所有卡片資料都集中在這裡。
- `assets/directory.css`：整個網站的顏色、版面和卡片樣式。
- `assets/main.js`：把 `items.js` 裡的卡片顯示到頁面上。

## 如何新增一張卡片

打開 `assets/items.js`，照原本格式多加一段資料。

範例：

```js
{
  title: "新的工具名稱",
  description: "用一句話說明這個工具做什麼。",
  category: "tool",
  href: "https://example.com",
  tag: "教學",
  featured: true
}
```

分類可以用：

- `tool`：工具
- `presentation`：簡報
- `video`：影片
- `music`：音樂
- `website`：網站
- `game`：教學遊戲
- `link`：相關連結

`featured: true` 代表這張卡片也會出現在首頁的精選區。

## 發布到 GitHub Pages 的方向

之後建立 GitHub repository 時，repository 名稱建議使用：

`lan-teacher-studio`

GitHub Pages 設定選擇從 `main` 分支的根目錄發布即可，不需要額外建置指令。

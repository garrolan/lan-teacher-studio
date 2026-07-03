(function () {
  var itemLists = document.querySelectorAll("[data-card-list]");
  var categoryLabels = {
    tool: "工具",
    presentation: "簡報",
    video: "影片",
    music: "音樂",
    website: "網站",
    game: "教學遊戲",
    link: "相關連結"
  };

  function createCard(item) {
    var card = document.createElement("article");
    card.className = "tool-card";
    card.setAttribute(
      "data-search-text",
      [item.title, item.description, item.tag, categoryLabels[item.category]].join(" ").toLowerCase()
    );
    card.setAttribute("data-category", item.category);

    var cardTop = document.createElement("div");
    cardTop.className = "card-top";

    var iconWrap = document.createElement("span");
    iconWrap.className = "card-icon";
    iconWrap.setAttribute("aria-hidden", "true");

    var icon = document.createElement("i");
    icon.setAttribute("data-lucide", item.icon || "link");
    iconWrap.appendChild(icon);

    var tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item.tag || categoryLabels[item.category] || "工具";

    cardTop.appendChild(iconWrap);
    cardTop.appendChild(tag);

    var title = document.createElement("h3");
    title.textContent = item.title;

    var description = document.createElement("p");
    description.textContent = item.description;

    var link = document.createElement("a");
    link.className = "card-link";
    link.href = item.href;
    var linkIcon = document.createElement("i");
    linkIcon.setAttribute("data-lucide", item.href === "#" ? "clock" : "external-link");
    linkIcon.setAttribute("aria-hidden", "true");
    var linkText = document.createElement("span");
    linkText.textContent = item.href === "#" ? "待加入連結" : "開啟";

    link.appendChild(linkIcon);
    link.appendChild(linkText);

    if (item.href !== "#" && item.href.indexOf("http") === 0) {
      link.target = "_blank";
      link.rel = "noopener";
    }

    card.appendChild(cardTop);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(link);

    return card;
  }

  function emptyState() {
    var message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "目前尚未放入項目。";
    return message;
  }

  itemLists.forEach(function (list) {
    var listType = list.getAttribute("data-card-list");
    var items = window.STUDIO_ITEMS || [];

    if (listType === "all") {
      items = items;
    } else if (listType === "featured") {
      items = items.filter(function (item) {
        return item.featured;
      });
    } else {
      items = items.filter(function (item) {
        return item.category === listType;
      });
    }

    if (!items.length) {
      list.appendChild(emptyState());
      return;
    }

    items.forEach(function (item) {
      list.appendChild(createCard(item));
    });
  });

  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }

  var searchInput = document.querySelector("[data-tool-search-input]");
  var searchableCards = document.querySelector("[data-searchable-cards]");
  var searchEmpty = document.querySelector("[data-search-empty]");
  var toolCount = document.querySelector("[data-tool-count]");

  if (toolCount && searchableCards) {
    var cards = searchableCards.querySelectorAll(".tool-card");
    toolCount.textContent = cards.length + " 個工具";
  }

  function updateDirectory() {
    if (!searchableCards) {
      return;
    }

    var activeFilter = document.querySelector("[data-filter-button].active");
    var filterValue = activeFilter ? activeFilter.getAttribute("data-filter-button") : "all";
    var keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var cards = searchableCards.querySelectorAll(".tool-card");
    var visibleCount = 0;

    cards.forEach(function (card) {
      var text = card.getAttribute("data-search-text") || "";
      var category = card.getAttribute("data-category");
      var matchesText = text.indexOf(keyword) !== -1;
      var matchesCategory = filterValue === "all" || category === filterValue;
      var isVisible = matchesText && matchesCategory;

      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (toolCount) {
      toolCount.textContent = visibleCount + " 個項目";
    }

    if (searchEmpty) {
      searchEmpty.hidden = visibleCount !== 0;
    }
  }

  if (searchInput && searchableCards) {
    searchInput.addEventListener("input", function () {
      updateDirectory();
    });
  }

  var filterButtons = document.querySelectorAll("[data-filter-button]");

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      filterButtons.forEach(function (item) {
        item.classList.remove("active");
      });

      button.classList.add("active");
      updateDirectory();
    });
  });

  if (searchableCards) {
    updateDirectory();
  }
})();

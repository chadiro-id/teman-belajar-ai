// Teman Belajar AI - Popup Menu

const popupMenu = (boundingRect, menus = [], title = "") => {
  const popupMenuEl = document.createElement("div");
  popupMenuEl.className = "tb-popup-menu";
  const titleEl = document.createElement("span");
  titleEl.className = "tb-popup-menu__title";
  const menuList = document.createElement("ul");
  menuList.className = "tb-popup-menu__list";
  
  for (const menu of menus) {
    const menuItem = document.createElement("li");
    menuItem.className = "tb-popup-menu__list-item";
    menuItem.textContent = menu;
    const evtOptions = {
      detail: {
        index: menus.indexOf(menu),
        menu
      }
    }

    menuItem.addEventListener("click", () => {
      popupMenuEl.dispatchEvent(new CustomEvent("itemClick", evtOptions));
    });
    menuList.appendChild(menuItem);
  }
  
  if (title) {
    titleEl.textContent = title;
    popupMenuEl.appendChild(titleEl);
  }
  popupMenuEl.tabIndex = -1;
  popupMenuEl.addEventListener("focusout", () => {
    console.log("Focus out");
    popupMenuEl.dispatchEvent(new Event("detach"));
    popupMenuEl.remove();
  });

  popupMenuEl.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      console.log("Escaped");
      popupMenuEl.dispatchEvent(new Event("detach"));
      popupMenuEl.remove();
    }
  });

  popupMenuEl.appendChild(menuList);

  const overlay = document.getElementById("app-overlay");
  overlay.appendChild(popupMenuEl);

  let top = boundingRect.top + window.scrollY;
  let left = boundingRect.left + boundingRect.width + window.scrollX + 16
  if (top + popupMenuEl.offsetHeight > window.innerHeight + window.scrollY) {
    top = boundingRect.top + window.scrollY - popupMenuEl.offsetHeight - 16;
  }

  if (left + popupMenuEl.offsetWidth > window.innerWidth + window.scrollX) {
    left = boundingRect.left + window.scrollX - popupMenuEl.offsetWidth - 16;
  }

  popupMenuEl.style.top = `${top}px`;
  popupMenuEl.style.left = `${left}px`;

  popupMenuEl.focus();
  return popupMenuEl;
}

export {
  popupMenu
}
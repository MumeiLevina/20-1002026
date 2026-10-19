"use strict";

/*
 * Thay URL ảnh tại đây. Có thể dùng URL tuyệt đối hoặc đường dẫn file tương đối.
 * Ví dụ: "assets/me.jpg". Để chuỗi rỗng sẽ dùng placeholder có sẵn.
 */
const CARD_CONFIG = {
  mom: {
    avatarUrl: "assets/me.png",
    backgroundUrl: ""
  },
  paternalGrandma: {
    avatarUrl: "assets/ba-noi.png",
    backgroundUrl: ""
  },
  maternalGrandma: {
    avatarUrl: "",
    backgroundUrl: ""
  }
};

/*
 * Registry dữ liệu dùng chung cho render ảnh, theme và vòng đời animation.
 * Muốn thêm thiệp mới, bổ sung cấu hình, markup có data-card-view và một entry tại đây.
 */
const CARD_DATA = {
  mom: {
    id: "mom",
    recipient: "mẹ",
    title: "Gửi mẹ yêu của con",
    subtitle: "Dành riêng cho mẹ",
    message: "Lời chúc 20/10 dành cho mẹ",
    avatarUrl: CARD_CONFIG.mom.avatarUrl,
    backgroundUrl: CARD_CONFIG.mom.backgroundUrl,
    theme: "mom"
  },
  paternalGrandma: {
    id: "paternalGrandma",
    recipient: "bà nội",
    title: "Gửi bà nội kính yêu",
    subtitle: "Những yêu thương của bà luôn là ký ức ấm áp trong lòng cháu.",
    message: "Lời chúc 20/10 dành riêng cho bà nội",
    avatarUrl: CARD_CONFIG.paternalGrandma.avatarUrl,
    backgroundUrl: CARD_CONFIG.paternalGrandma.backgroundUrl,
    theme: "paternal"
  },
  maternalGrandma: {
    id: "maternalGrandma",
    recipient: "bà ngoại",
    title: "Gửi bà ngoại kính yêu",
    subtitle: "Sự dịu dàng của bà luôn là điều cháu trân trọng mãi.",
    message: "Lời chúc 20/10 dành riêng cho bà ngoại",
    avatarUrl: CARD_CONFIG.maternalGrandma.avatarUrl,
    backgroundUrl: CARD_CONFIG.maternalGrandma.backgroundUrl,
    theme: "maternal"
  }
};

const App = (() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const welcome = document.querySelector("#welcome");
  const openingScene = document.querySelector("#openingScene");
  const statusMessage = document.querySelector("#statusMessage");
  const soundToggle = document.querySelector("#soundToggle");
  const soundLabel = soundToggle.querySelector(".sound-button__label");
  const celebrationPetals = document.querySelector("#celebrationPetals");
  const cards = Object.fromEntries(
    [...document.querySelectorAll("[data-card-view]")].map((card) => [card.dataset.cardView, card])
  );

  let activeCard = null;
  let transitionLocked = false;
  let timers = [];
  let lastTrigger = null;

  const wait = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  };

  const clearTimers = () => {
    timers.forEach(window.clearTimeout);
    timers = [];
  };

  const announce = (message) => {
    statusMessage.textContent = "";
    requestAnimationFrame(() => { statusMessage.textContent = message; });
  };

  const setupImage = (selector, url) => {
    const image = document.querySelector(selector);
    if (!image || !url || !url.trim()) {
      image?.removeAttribute("src");
      image?.classList.remove("is-loaded");
      return;
    }
    image.onload = () => image.classList.add("is-loaded");
    image.onerror = () => {
      image.removeAttribute("src");
      image.classList.remove("is-loaded");
    };
    image.src = url.trim();
  };

  const setupBackground = (selector, url) => {
    const layer = document.querySelector(selector);
    if (!layer || !url || !url.trim()) return;
    const probe = new Image();
    probe.onload = () => {
      layer.style.backgroundImage = `linear-gradient(rgba(255,249,245,.65), rgba(246,221,226,.74)), url("${url.trim().replace(/"/g, "%22")}")`;
      layer.classList.add("has-image");
    };
    probe.onerror = () => layer.classList.remove("has-image");
    probe.src = url.trim();
  };

  const applyConfig = () => {
    Object.values(CARD_DATA).forEach((card) => {
      setupImage(`[data-avatar="${card.id}"]`, card.avatarUrl);
      setupBackground(`[data-bg="${card.id}"]`, card.backgroundUrl);
    });
  };

  const resetCard = (card) => {
    card.classList.remove("is-reading", "is-visible");
    card.setAttribute("aria-hidden", "true");
    card.scrollTop = 0;
    card.querySelectorAll(".reveal-item").forEach((element) => {
      element.style.animation = "none";
      void element.offsetWidth;
      element.style.animation = "";
    });
  };

  const spawnPetals = () => {
    celebrationPetals.replaceChildren();
    if (reduceMotion.matches) return;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 16; index += 1) {
      const petal = document.createElement("i");
      petal.className = "petal";
      petal.style.setProperty("--x", `${5 + Math.random() * 90}%`);
      petal.style.setProperty("--delay", `${Math.random() * 1.8}s`);
      petal.style.setProperty("--duration", `${8 + Math.random() * 7}s`);
      petal.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
      petal.style.setProperty("--size", `${7 + Math.random() * 8}px`);
      fragment.appendChild(petal);
    }
    celebrationPetals.appendChild(fragment);
    wait(() => celebrationPetals.replaceChildren(), 15500);
  };

  const revealCard = (type) => {
    const card = cards[type];
    openingScene.classList.remove("is-active", "is-opening");
    openingScene.setAttribute("aria-hidden", "true");
    welcome.hidden = true;
    card.classList.add("is-visible");
    card.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-card-open");
    requestAnimationFrame(() => {
      card.classList.add("is-reading");
      card.querySelector("[data-action='close']")?.focus({ preventScroll: true });
    });
    activeCard = type;
    transitionLocked = false;
    spawnPetals();
    announce(`Thiệp dành cho ${CARD_DATA[type].recipient} đã mở.`);
  };

  const openCard = (type, trigger = null) => {
    if (transitionLocked || !cards[type]) return;
    transitionLocked = true;
    lastTrigger = trigger || lastTrigger;
    clearTimers();
    celebrationPetals.replaceChildren();
    Object.values(cards).forEach(resetCard);
    welcome.hidden = false;
    welcome.classList.add("is-leaving");
    openingScene.dataset.theme = CARD_DATA[type].theme;
    openingScene.classList.add("is-active");
    openingScene.setAttribute("aria-hidden", "false");
    openingScene.classList.remove("is-opening");

    if (reduceMotion.matches) {
      revealCard(type);
      return;
    }

    requestAnimationFrame(() => openingScene.classList.add("is-opening"));
    wait(() => revealCard(type), 1850);
  };

  const closeCard = () => {
    if (!activeCard || transitionLocked) return;
    transitionLocked = true;
    clearTimers();
    celebrationPetals.replaceChildren();
    const card = cards[activeCard];
    card.classList.remove("is-reading");
    card.style.opacity = "0";
    card.style.transition = reduceMotion.matches ? "none" : "opacity .35s ease";
    wait(() => {
      resetCard(card);
      card.removeAttribute("style");
      welcome.hidden = false;
      welcome.classList.remove("is-leaving");
      document.body.classList.remove("is-card-open");
      activeCard = null;
      transitionLocked = false;
      lastTrigger?.focus({ preventScroll: true });
      announce("Đã đóng thiệp. Bạn có thể chọn một tấm thiệp khác.");
    }, reduceMotion.matches ? 0 : 360);
  };

  const replayCard = () => {
    if (!activeCard || transitionLocked) return;
    const type = activeCard;
    cards[type].classList.remove("is-reading");
    cards[type].scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    cards[type].querySelectorAll(".reveal-item").forEach((element) => {
      element.style.animation = "none";
      void element.offsetWidth;
      element.style.animation = "";
    });
    wait(() => {
      cards[type].classList.add("is-reading");
      spawnPetals();
      announce("Đang phát lại câu chuyện của tấm thiệp.");
    }, reduceMotion.matches ? 0 : 260);
  };

  const bindInteractions = () => {
    document.querySelectorAll("[data-card]").forEach((button) => {
      button.addEventListener("click", () => openCard(button.dataset.card, button));
    });
    document.querySelectorAll("[data-action='close']").forEach((button) => button.addEventListener("click", closeCard));
    document.querySelectorAll("[data-action='replay']").forEach((button) => button.addEventListener("click", replayCard));
    document.querySelector(".brand").addEventListener("click", (event) => {
      event.preventDefault();
      if (activeCard) closeCard();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeCard) closeCard();
    });
  };

  const Music = (() => {
    let context = null;
    let master = null;
    let loopTimer = null;
    let isPlaying = false;
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392];

    const playPhrase = () => {
      if (!isPlaying || !context || !master) return;
      const startAt = context.currentTime + .08;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, startAt + index * .58);
        gain.gain.linearRampToValueAtTime(.055, startAt + index * .58 + .08);
        gain.gain.exponentialRampToValueAtTime(.001, startAt + index * .58 + .52);
        oscillator.connect(gain).connect(master);
        oscillator.start(startAt + index * .58);
        oscillator.stop(startAt + index * .58 + .55);
      });
    };

    const start = async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        announce("Trình duyệt này không hỗ trợ nhạc nền.");
        return false;
      }
      context ||= new AudioContextClass();
      if (context.state === "suspended") await context.resume();
      master ||= context.createGain();
      master.gain.value = .22;
      master.connect(context.destination);
      isPlaying = true;
      playPhrase();
      loopTimer = window.setInterval(playPhrase, 5200);
      return true;
    };

    const stop = () => {
      isPlaying = false;
      window.clearInterval(loopTimer);
      loopTimer = null;
    };

    const toggle = async () => {
      if (isPlaying) {
        stop();
        soundToggle.setAttribute("aria-pressed", "false");
        soundToggle.setAttribute("aria-label", "Bật nhạc nền");
        soundLabel.textContent = "Bật nhạc";
        announce("Đã tắt nhạc nền.");
        return;
      }
      if (await start()) {
        soundToggle.setAttribute("aria-pressed", "true");
        soundToggle.setAttribute("aria-label", "Tắt nhạc nền");
        soundLabel.textContent = "Tắt nhạc";
        announce("Đã bật nhạc nền.");
      }
    };

    return { toggle };
  })();

  const init = () => {
    applyConfig();
    bindInteractions();
    soundToggle.addEventListener("click", Music.toggle);
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);

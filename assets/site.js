// Liens et adresses du réseau : tout se change ici.
const EASYPVP = {
  ip: "play.easypvp.fr",
  mumble: "mumble.easypvp.fr:35976",
  discord: "https://discord.gg/8E5PF7N",
  vote: "https://serveur-prive.net/minecraft/easypvp-4924/vote",
  boutique: "https://easypvp.tebex.store",
};

// Liens pilotés par data-link="discord|vote|boutique"
document.querySelectorAll("[data-link]").forEach((a) => {
  const url = EASYPVP[a.dataset.link];
  if (url) {
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
  } else {
    a.removeAttribute("href");
    a.setAttribute("aria-disabled", "true");
    a.classList.add("is-disabled");
    a.textContent = "Bientôt disponible";
  }
});

// Menu mobile
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// Copie de l'adresse (serveur ou Mumble)
const toast = document.createElement("div");
toast.className = "toast";
toast.setAttribute("role", "status");
document.body.appendChild(toast);
let toastTimer;
function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const value = EASYPVP[btn.dataset.copy] || btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      showToast(value + " copié !");
    } catch (e) {
      showToast("Adresse : " + value);
    }
  });
});

// Joueurs en ligne, via l'API publique mcstatus.io (mise en cache une minute chez eux).
const statusEls = document.querySelectorAll("[data-status]");
if (statusEls.length) {
  fetch("https://api.mcstatus.io/v2/status/java/" + EASYPVP.ip)
    .then((r) => r.json())
    .then((data) => {
      const online = data && data.online;
      const count = online && data.players ? data.players.online : 0;
      statusEls.forEach((el) => {
        const dot = el.querySelector(".dot");
        const text = el.querySelector("[data-status-text]");
        if (dot) dot.classList.add(online ? "on" : "off");
        if (text) {
          text.textContent = online
            ? count + (count > 1 ? " joueurs connectés" : " joueur connecté")
            : "Serveur hors ligne";
        }
      });
      document.querySelectorAll("[data-players]").forEach((el) => {
        el.textContent = online ? count : "–";
      });
    })
    .catch(() => {
      statusEls.forEach((el) => {
        const text = el.querySelector("[data-status-text]");
        if (text) text.textContent = "Statut indisponible";
      });
    });
}

// Année du pied de page
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

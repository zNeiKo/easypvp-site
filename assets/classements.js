// Classements : lit assets/classements.json (publie toutes les heures par le serveur) et affiche
// un onglet par jeu. Un classement vide invite a prendre la premiere place.
(function () {
  const ONGLETS = ["uhc", "practice", "skyblock", "dropper", "niveau"];
  const nb = (n) => Number(n).toLocaleString("fr-FR");
  const pluriel = (n, mot) => nb(n) + " " + mot + (n > 1 ? "s" : "");
  const chrono = (ms) => ms < 60000 ? (ms / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " s"
    : Math.floor(ms / 60000) + ":" + ((ms % 60000) / 1000).toLocaleString("fr-FR", { minimumIntegerDigits: 2, minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const slug = (nom) => { const n = nom.toLowerCase(); return n.startsWith(".") ? "bedrock-" + n.slice(1) : n; };
  const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function carte(titre, sousTitre, lignes, valeur, vide) {
    const c = document.createElement("article");
    c.className = "classement";
    let html = `<header><h3>${echapper(titre)}</h3>${sousTitre ? `<span>${echapper(sousTitre)}</span>` : ""}</header>`;
    if (!lignes.length) {
      html += `<p class="vide">${vide || "Personne pour l'instant. La première place est à prendre !"}</p>`;
    } else {
      html += "<ol>";
      lignes.forEach((l, i) => {
        const tete = encodeURIComponent(l.nom.replace(/^\./, ""));
        html += `<li class="${i < 3 ? "rang-" + (i + 1) : ""}">
          <span class="rang">${i + 1}</span>
          <img src="https://mc-heads.net/avatar/${tete}/24" alt="" width="24" height="24" loading="lazy">
          <span class="pseudo"><a href="/joueur/${encodeURIComponent(slug(l.nom))}/">${echapper(l.nom)}</a></span>
          <span class="score">${valeur(l)}</span>
        </li>`;
      });
      html += "</ol>";
    }
    c.innerHTML = html;
    return c;
  }

  function grille(id, cartes) {
    const p = document.getElementById(id);
    p.innerHTML = "";
    const g = document.createElement("div");
    g.className = "classements-grille";
    cartes.forEach((c) => g.appendChild(c));
    p.appendChild(g);
  }

  function afficher(d) {
    grille("p-uhc", (d.uhc || []).map((m) => carte(m.mode, "Victoires", m.top, (l) => pluriel(l.valeur, "victoire"))));
    const pr = d.practice || { kits: [], victoires: [] };
    grille("p-practice", [carte("Victoires en duel", "Tous kits", pr.victoires, (l) => pluriel(l.valeur, "victoire"))]
      .concat(pr.kits.map((k) => carte(k.kit, "ELO classé", k.top, (l) => nb(l.valeur) + " ELO"))));
    grille("p-skyblock", [carte("Les plus belles îles", "Valeur de l'île, comme /is top", d.skyblock || [],
      (l) => nb(l.valeur) + " pts")]);
    const dr = d.dropper || { complet: [], marathon: [], maps: [], victoires: [], joueurs: [] };
    const semaine = dr.semaine ? [carte("Map de la semaine : " + dr.semaine.nom, "Top 3 récompensé dimanche 21 h", dr.semaine.top, (l) => chrono(l.valeur))] : [];
    grille("p-dropper", semaine.concat([carte("Parcours complet", "5 maps tirées au sort", dr.complet, (l) => chrono(l.valeur)),
      carte("Marathon", "Les 10 maps officielles", dr.marathon || [], (l) => chrono(l.valeur)),
      carte("Victoires en course", "Courses à plusieurs", dr.victoires, (l) => pluriel(l.valeur, "victoire")),
      carte("Créateurs de maps", "Maps des joueurs les plus aimées", dr.joueurs || [],
        (l) => `${echapper(l.map)} <small>${pluriel(l.valeur, "j'aime")}</small>`,
        "Aucune map publiée pour l'instant : crée la tienne à l'atelier du Dropper !")]
      .concat(dr.maps.map((m) => carte(m.nom, "Meilleurs temps", m.top, (l) => chrono(l.valeur))))));
    grille("p-niveau", [carte("Niveau réseau", "Tous serveurs confondus", d.niveau || [],
      (l) => "Niv. " + nb(l.valeur) + (l.titre ? ` <small>${echapper(l.titre)}</small>` : ""),
      "Le niveau réseau arrive bientôt : chaque partie, chaque kill et chaque quête te feront monter.")]);
    if (d.maj) {
      const t = new Date(d.maj);
      document.getElementById("maj").textContent = "Dernière mise à jour : " +
        t.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) + " à " +
        t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) + ".";
    }
  }

  // onglets : clic, fleches du clavier, et lien direct (/classements#practice)
  const boutons = ONGLETS.map((o) => document.getElementById("o-" + o));
  function choisir(o, focus) {
    ONGLETS.forEach((x, i) => {
      const actif = x === o;
      boutons[i].setAttribute("aria-selected", String(actif));
      boutons[i].tabIndex = actif ? 0 : -1;
      document.getElementById("p-" + x).hidden = !actif;
    });
    if (focus) document.getElementById("o-" + o).focus();
    if (location.hash.slice(1) !== o) history.replaceState(null, "", "#" + o);
  }
  boutons.forEach((b, i) => {
    b.addEventListener("click", () => choisir(ONGLETS[i]));
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      choisir(ONGLETS[(i + (e.key === "ArrowRight" ? 1 : ONGLETS.length - 1)) % ONGLETS.length], true);
    });
  });
  const depart = location.hash.slice(1);
  choisir(ONGLETS.includes(depart) ? depart : "uhc");

  fetch("assets/classements.json?" + Date.now())
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(afficher)
    .catch(() => {
      document.getElementById("p-uhc").innerHTML = '<p class="muted">Les classements ne sont pas disponibles pour le moment. Réessaie dans quelques minutes.</p>';
    });
})();

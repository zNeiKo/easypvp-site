// Profils des joueurs : lit assets/joueurs.json (publie toutes les heures par le serveur).
// Sans pseudo (/joueur/) : liste de tous les joueurs avec une recherche. Avec un pseudo : son profil.
// Le pseudo vient de <meta name="joueur"> (pages /joueur/<slug>/ generees par outils/profils.py) ou de ?p=.
(function () {
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const nb = (n) => Number(n).toLocaleString("fr-FR");
  const pl = (n, mot) => nb(n) + " " + mot + (n > 1 ? "s" : "");
  const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (nom) => { const n = nom.toLowerCase(); return n.startsWith(".") ? "bedrock-" + n.slice(1) : n; };
  const tete = (nom, t) => `https://mc-heads.net/avatar/${encodeURIComponent(nom.replace(/^\./, ""))}/${t}`;
  const chrono = (ms) => ms < 60000 ? (ms / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " s"
    : Math.floor(ms / 60000) + ":" + ((ms % 60000) / 1000).toLocaleString("fr-FR", { minimumIntegerDigits: 2, minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const rang = (r) => r === 1 ? '<span class="rang-badge or">1er</span>' : r <= 3 ? `<span class="rang-badge">${r}e</span>` : `<span class="rang-txt">${r}e</span>`;

  function vu(jour) {
    if (!jour) return "";
    const d = new Date(jour + "T12:00:00");
    const auj = new Date(); auj.setHours(12, 0, 0, 0);
    const ecart = Math.round((auj - d) / 86400000);
    if (ecart <= 0) return "Vu aujourd'hui";
    if (ecart === 1) return "Vu hier";
    return "Vu le " + d.getDate() + " " + MOIS[d.getMonth()] + (d.getFullYear() !== auj.getFullYear() ? " " + d.getFullYear() : "");
  }

  function bloc(titre, contenu) {
    return `<article class="profil-bloc"><h2>${titre}</h2>${contenu}</article>`;
  }

  function lignes(items) {
    return "<ul class=\"profil-lignes\">" + items.map(([g, d]) => `<li><span>${g}</span><b>${d}</b></li>`).join("") + "</ul>";
  }

  function profil(p) {
    const n = p.niveau;
    let html = `<header class="profil-tete">
      <img src="${tete(p.nom, 96)}" alt="" width="96" height="96">
      <div>
        <h1>${echapper(p.nom)}</h1>
        <p class="profil-badges"><span class="tag">${echapper(p.grade || "Joueur")}</span>${n ? `<span class="tag">Niveau ${n.niveau}${n.titre ? " · " + echapper(n.titre) : ""}</span>` : ""}${p.passeport && p.passeport.fini ? '<span class="tag">Passeport complet</span>' : ""}</p>
        <p class="muted">${vu(p.vu)}</p>
      </div>
    </header>`;
    if (n) html += `<div class="profil-xp" title="${nb(n.dans)} / ${nb(n.pour)} XP"><span style="width:${Math.min(100, Math.round(100 * n.dans / n.pour))}%"></span></div>
      <p class="muted profil-xp-txt">${nb(n.xp)} XP au total · ${nb(n.pour - n.dans)} XP avant le niveau ${n.niveau + 1} · ${rang(n.rang)} du réseau</p>`;
    const blocs = [];
    if (p.dropper) blocs.push(bloc("Dropper", lignes(p.dropper.map((d) => [echapper(d.nom), chrono(d.temps) + " " + rang(d.rang)]))
      + (p.courses ? `<p class="muted">Courses : ${pl(p.courses.courses, "course")}, ${pl(p.courses.victoires, "victoire")}</p>` : "")));
    if (p.practice) {
      const kits = Object.keys(p.practice.elo || {}).sort((a, b) => p.practice.elo[b] - p.practice.elo[a]);
      blocs.push(bloc("Practice", lignes([["Victoires", nb(p.practice.victoires)]].concat(kits.map((k) => ["ELO " + echapper(k), nb(p.practice.elo[k]) + " " + rang(p.practice.rangs[k])])))));
    }
    if (p.vagues || p.entrainement) {
      const l = [];
      if (p.vagues) l.push(["Arène de vagues (record)", pl(p.vagues.record, "vague")]);
      (p.entrainement || []).forEach((e) => l.push([echapper(e.nom), "score " + nb(e.score) + " " + rang(e.rang)]));
      blocs.push(bloc("Vagues et entraînement", lignes(l)));
    }
    if (p.cachecache) blocs.push(bloc("Cache-cache", lignes([["Points", nb(p.cachecache.points || 0)], ["Parties", nb(p.cachecache.parties)], ["Victoires", nb(p.cachecache.victoires)],
      ["Cacheurs trouvés", nb(p.cachecache.trouves)], ["Parties survécues (cacheur)", nb(p.cachecache.survies)]])));
    if (p.rush) {
      const l = (p.rush.elo || []).map((e) => ["ELO " + echapper(e.mode), nb(e.elo) + " <small>(" + pl(e.victoires, "victoire") + ")</small>"]);
      if (p.rush.hika) l.push(["HikaBrain", pl(p.rush.hika.victoires, "victoire") + " · " + pl(p.rush.hika.points, "point")]);
      if (p.rush.rush) l.push(["Rush", pl(p.rush.rush.victoires, "victoire") + " · " + pl(p.rush.rush.lits, "lit") + " cassé" + (p.rush.rush.lits > 1 ? "s" : "") + " · " + pl(p.rush.rush.finales, "kill") + " final" + (p.rush.rush.finales > 1 ? "s" : "")]);
      if (l.length) blocs.push(bloc("Rush & HikaBrain", lignes(l)));
    }
    if (p.ile) blocs.push(bloc("Skyblock", lignes([["Île", echapper(p.ile.nom || "sans nom")], ["Valeur", nb(p.ile.valeur) + " pts " + rang(p.ile.rang)]])));
    if (p.uhc) blocs.push(bloc("UHC, Loup-Garou, Taupe Gun", lignes(p.uhc.victoires.map((v) => [echapper(v.mode), pl(v.victoires, "victoire")])
      .concat([["Éliminations", nb(p.uhc.kills)], ["Morts", nb(p.uhc.morts)]]))));
    if (p.maps) blocs.push(bloc("Maps créées (Dropper)", lignes(p.maps.map((m) => [echapper(m.nom), pl(m.jaime, "j'aime") + " · " + pl(m.essais, "essai")]))));
    if (p.passeport && !p.passeport.fini) blocs.push(bloc("Passeport du réseau", `<p class="muted">${p.passeport.etapes} étape${p.passeport.etapes > 1 ? "s" : ""} sur 6.</p>`));
    html += blocs.length ? `<div class="profil-grille">${blocs.join("")}</div>`
      : '<p class="muted">Pas encore de statistiques : ce joueur débute sur EasyPvP.</p>';
    document.getElementById("profil").innerHTML = html;
  }

  function liste(d) {
    const tous = Object.keys(d).map((s) => Object.assign({ slug: s }, d[s]));
    tous.sort((a, b) => ((b.niveau || {}).xp || 0) - ((a.niveau || {}).xp || 0) || a.nom.localeCompare(b.nom));
    document.getElementById("profil").innerHTML = `<div class="page-hero"><span class="kicker">Joueurs</span><h1>Les joueurs d'EasyPvP</h1>
      <p>Cherche un pseudo ou clique sur un joueur pour voir son profil.</p></div>
      <div class="profil-liste">${tous.map((p) => `<a href="/joueur/${encodeURIComponent(p.slug)}/"><img src="${tete(p.nom, 40)}" alt="" width="40" height="40" loading="lazy">
      <span>${echapper(p.nom)}</span><small>${p.niveau ? "Niv. " + p.niveau.niveau : ""}</small></a>`).join("")}</div>`;
  }

  const meta = document.querySelector('meta[name="joueur"]');
  const demande = (meta && meta.content) || new URLSearchParams(location.search).get("p") || "";
  fetch("/assets/joueurs.json?" + Date.now())
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => {
      const dl = document.getElementById("pseudos");
      Object.keys(d).forEach((s) => { const o = document.createElement("option"); o.value = d[s].nom; dl.appendChild(o); });
      document.getElementById("recherche").addEventListener("submit", (e) => {
        e.preventDefault();
        const s = slug(document.getElementById("pseudo").value.trim());
        if (d[s]) location.href = "/joueur/" + encodeURIComponent(s) + "/";
        else document.getElementById("pseudo").setCustomValidity("Joueur introuvable"), document.getElementById("pseudo").reportValidity();
      });
      document.getElementById("pseudo").addEventListener("input", (e) => e.target.setCustomValidity(""));
      const s = slug(demande);
      if (s && d[s]) profil(d[s]);
      else if (s) document.getElementById("profil").innerHTML = '<p class="muted">Ce joueur n\'a pas de profil (pas encore venu sur le serveur, ou membre du staff).</p>';
      else liste(d);
    })
    .catch(() => { document.getElementById("profil").innerHTML = '<p class="muted">Les profils ne sont pas disponibles pour le moment.</p>'; });
})();

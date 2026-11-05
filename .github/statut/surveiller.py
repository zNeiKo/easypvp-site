# -*- coding: utf-8 -*-
"""
Filet de securite du panneau de statut du Discord : PC eteint ou coupure de courant.

Sur le PC, le proxy (ou outils/statut_discord.py s'il est arrete) modifie le panneau chaque minute. Si le PC
s'eteint d'un coup, plus rien ne le modifie et il reste vert. Ce script tourne sur GitHub, toutes les 10 min :
il passe le panneau au rouge seulement si le panneau n'a plus bouge depuis SEUIL_MINUTES ET si le serveur ne
repond pas a ESSAIS tentatives. Au retour du PC, le proxy remet le panneau a jour tout seul.

Secrets GitHub : STATUT_WEBHOOK, STATUT_MESSAGE. Les journaux sont publics : rien de secret n'y est ecrit.
"""
import datetime, json, os, socket, struct, sys, time, urllib.error, urllib.request

ADRESSE = 'play.easypvp.fr'
PORT = 25565
SEUIL_MINUTES = 15
ESSAIS = 3
ATTENTE_SECONDES = 20
ROUGE = 0xED4245
ENTETES = {'Content-Type': 'application/json', 'User-Agent': 'DiscordBot (https://easypvp.fr, 1.0)'}


def varint(n):
    o = b''
    while True:
        b = n & 0x7f
        n >>= 7
        o += bytes([b | (0x80 if n else 0)])
        if not n:
            return o


def lire_varint(s):
    v = 0
    for i in range(5):
        b = s.recv(1)
        if not b:
            raise OSError('connexion fermee')
        v |= (b[0] & 0x7f) << (7 * i)
        if not b[0] & 0x80:
            return v
    raise OSError('reponse invalide')


def repond():
    """Ping Minecraft. Seul notre proxy compte : une reponse de la protection DDoS sans lui ne prouve rien."""
    try:
        with socket.create_connection((ADRESSE, PORT), 8) as s:
            s.settimeout(8)
            d = varint(0) + varint(47) + varint(len(ADRESSE)) + ADRESSE.encode() + struct.pack('>H', PORT) + varint(1)
            s.sendall(varint(len(d)) + d + b'\x01\x00')
            lire_varint(s)
            lire_varint(s)
            n = lire_varint(s)
            b = b''
            while len(b) < n:
                m = s.recv(n - len(b))
                if not m:
                    raise OSError('reponse coupee')
                b += m
        return 'BungeeCord' in json.loads(b).get('version', {}).get('name', '')
    except (OSError, ValueError):
        return False


def appel(url, methode='GET', corps=None):
    data = json.dumps(corps).encode('utf-8') if corps is not None else None
    r = urllib.request.Request(url, data=data, method=methode, headers=ENTETES)
    with urllib.request.urlopen(r, timeout=15) as rep:
        t = rep.read()
        return json.loads(t) if t else None


def en_rouge(embed):
    champs = []
    for c in embed.get('fields', []):
        c = dict(c)
        if c['name'].startswith('👥'):
            c['name'] = '👥 Connectés (0)'
            c['value'] = '*Le serveur est hors ligne, on revient vite !*'
        elif not c.get('inline'):
            c['value'] = '\n'.join(l.split(' — ')[0] + ' — 🔴 hors ligne' for l in c['value'].split('\n'))
        elif c['value'].strip('​'):
            c['value'] = '🔴 Hors ligne'
        champs.append(c)
    e = dict(embed)
    e['fields'] = champs
    e['color'] = ROUGE
    e['description'] = '🔴 **Hors ligne** · le serveur ne répond plus, on revient vite !\n```' + ADRESSE + '```'
    e['timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return e


def main():
    url = os.environ['STATUT_WEBHOOK'] + '/messages/' + os.environ['STATUT_MESSAGE']
    apercu = os.environ.get('APERCU') == 'true'
    forcer = os.environ.get('FORCER') == 'true'
    try:
        embed = appel(url)['embeds'][0]
    except (urllib.error.URLError, KeyError, IndexError, ValueError) as e:
        # pas d'echec du travail : GitHub enverrait un courriel a chaque panne passagere de Discord
        print('Panneau illisible :', type(e).__name__, getattr(e, 'code', ''))
        return
    age = (datetime.datetime.now(datetime.timezone.utc)
           - datetime.datetime.fromisoformat(embed['timestamp'].replace('Z', '+00:00'))).total_seconds() / 60
    print('Panneau modifie il y a %.0f min, couleur %s.' % (age, hex(embed.get('color', 0))))
    if apercu:
        print('Le serveur repond :', repond())
        print('Apercu : rien n\'est envoye. Lignes rouges prevues :', len(en_rouge(embed)['fields']))
        return
    if not forcer:
        if embed.get('color') == ROUGE:
            print('Deja rouge : rien a faire.')
            return
        if age < SEUIL_MINUTES:
            print('Panneau a jour : le PC tourne.')
            return
        for i in range(ESSAIS):
            if repond():
                print('Panneau immobile, mais le serveur repond : pas de rouge.')
                return
            if i < ESSAIS - 1:
                time.sleep(ATTENTE_SECONDES)
    appel(url, 'PATCH', {'embeds': [en_rouge(embed)]})
    print('Panneau passe au rouge.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()

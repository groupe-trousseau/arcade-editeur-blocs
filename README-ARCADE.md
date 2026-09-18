# L'éditeur de code par blocs d'Arcade

Fork de `TurboWarp/scratch-gui`, **hors du monorepo Arcade**, **non publié**.

> **CE DÉPÔT N'EST PAS PUBLIÉ, ET IL NE DOIT PAS L'ÊTRE AUJOURD'HUI.**
> `D-003` : la publication du fork suit **la relecture juridique** du prérequis externe 18.
> Une publication ne se retire pas. Il n'existe ici aucun dépôt distant de publication, et
> le distant `origin` est celui du **clone d'amont**, qui sert aux rebases.
> Voir `LICENCES.md`.

---

## Pourquoi un dépôt à part

`INTEGRATION-SCRATCH-MAKECODE.md` §D1, et `DECISIONS.md` `D-003`. Trois raisons, chacune
suffisante :

1. **Technique.** `scratch-gui` est un projet Webpack de génération CRA, avec `scratch-vm`,
   `scratch-render`, `scratch-blocks`, `scratch-paint`, `scratch-storage` et
   `scratch-svg-renderer` dans son arbre. Le faire cohabiter avec le build Vite d'Arcade
   est une source de conflits permanents à chaque montée de version.
2. **Sécurité.** Cet éditeur exécute du code écrit par des enfants. Il doit tourner dans une
   **origine qui ne partage aucun cookie** avec la plateforme, exactement comme du contenu
   utilisateur.
3. **Licence.** Ce fork est **GPL-3.0**. L'embarquer dans l'application Arcade ferait de
   l'application une distribution du programme.

**Il n'est donc jamais une dépendance npm de `web/` ni de `admin/`**, et le lint d'Arcade
n'a rien à en dire : il n'y apparaît pas.

## Ce qui a été modifié, fichier par fichier

**Un seul fichier ajouté**, et quatre modifiés de quelques lignes. C'est ce qui rend les
rebases sur l'amont tenables — §4.1.

| Fichier | Nature | Ce qui change |
|---|---|---|
| `src/lib/pont-trousseau.js` | **ajouté** | tout le pont : protocole `trousseau:*`, contrôle d'origine, mode lecteur, fermeture des entrées de menu |
| `src/playground/render-interface.jsx` | modifié | importe le pont et l'installe une fois avec le `vm` du magasin ; lève le refus d'encadrement **quand, et seulement quand, une origine de plateforme a été déclarée au build** |
| `src/playground/editor.jsx` | modifié | passe à l'interface les propriétés que le pont décide |
| `src/components/menu-bar/menu-bar.jsx` | modifié | retire le bouton de retour, qui **sort vers un site communautaire extérieur** ; ajoute le lien **« Code source »** qu'exige la GPL |
| `src/lib/brand.js` | modifié | `APP_NAME` |
| `webpack.config.js` | modifié | injecte `ORIGINE_PLATEFORME` et `DEPOT_SOURCE` par `DefinePlugin` ; borne la minification sur `MINIFICATION_PARALLELE` ; ne construit la bibliothèque `dist/` que sur `BUILD_MODE=dist` |
| `Dockerfile`, `nginx-arcade.conf` | **ajoutés** | l'image servie : construction puis nginx, en-têtes du §« Déployer » |
| `Dockerfile.image` | **ajouté** | celui qu'emploie la plateforme : il ne compile rien, il **tire** l'image publiée |
| `.github/workflows/image.yml` | **ajouté** | construit et publie l'image, **hors du serveur qui sert Arcade** |

### Ce que le pont ferme, et pourquoi

§4.1 point 2 : « retirer les entrées de menu inutiles ou **dangereuses en contexte
scolaire** ». `proprietesDeLInterface()` les ferme une par une :

| Fermé | Par quoi | Pourquoi |
|---|---|---|
| connexion, compte | `enableCommunity: false` | **aucun compte tiers pour un élève** (§7.4) |
| partage communautaire | `canShare`, `canRemix`, `enableCommunity` | le travail d'un enfant ne part chez personne |
| chargement depuis une URL | absence de page d'accueil en mode encadré | une URL arbitraire dans un éditeur d'enfant |
| enregistrement chez un tiers | `canSave`, `canManageFiles` | la persistance passe par la plateforme, qui est authentifiée (`D3`) |
| variables de nuage | `canUseCloud: false` | un service extérieur qui reçoit des données |
| bouton de retour | retiré de `menu-bar.jsx` | il ouvrait `scratch.mit.edu` dans un nouvel onglet |
| nouveau projet, titre | `canCreateNew`, `canEditTitle` | écraserait le travail en cours ; le projet est nommé par le niveau |

## Construire

```bash
npm ci                       # ci, PAS install : voir LICENCES.md, les commits épinglés

NODE_ENV=production \
ORIGINE_PLATEFORME="https://l-arcade.fr,https://admin.l-arcade.fr" \
ROUTING_STYLE=filehash \
MINIFICATION_PARALLELE=2 \
npx webpack --bail           # sortie statique dans build/
```

### Cette construction prend la machine entière, et c'est mesuré

`terser-webpack-plugin` minifie avec **un processus par cœur moins un**, et dans un conteneur
il voit les cœurs de la machine **hôte**, pas ceux qu'on lui a donnés. Mesuré à froid sur
seize cœurs : **7,0 Go de pic** et 24 s. Le 2026-09-17, la plateforme de déploiement a
reconstruit cette image sur le serveur qui héberge la production d'Arcade : tout le serveur
est resté injoignable une heure, et la construction a fini en échec sans laisser de journal.

Deux variables la ramènent à **2,7 Go**, pour un paquet servi **identique**, empreinte de
contenu comprise :

| Variable | Ce qu'elle fait | Mesure |
|---|---|---|
| `MINIFICATION_PARALLELE=2` | borne le nombre de processus de minification | 5,1 → 2,7 Go |
| `BUILD_MODE` non posée | ne construit plus la bibliothèque UMD de `dist/`, qu'Arcade n'utilise pas et que l'image ne copie pas | 7,0 → 5,1 Go, 24 → 17 s |

Le `Dockerfile` pose déjà `MINIFICATION_PARALLELE=2`.

### L'image se construit dans l'intégration continue, pas sur le serveur

`.github/workflows/image.yml` construit et publie l'image à chaque poussée sur `arcade`, sur
une machine jetable de GitHub — le dépôt est public, ces minutes ne coûtent rien. Il peut
aussi se lancer à la main, en choisissant l'environnement.

```
ghcr.io/groupe-trousseau/arcade-editeur-blocs:recette
ghcr.io/groupe-trousseau/arcade-editeur-blocs:recette-<douze premiers caractères du commit>
```

L'étiquette mouvante sert au déploiement courant, celle qui porte le commit sert à revenir en
arrière. La plateforme de déploiement ne construit plus rien : **elle tire cette image**, par
`Dockerfile.image`, dont l'unique instruction est un `FROM`. Son champ « Dockerfile Location »
vaut donc `/Dockerfile.image`, et sa variable de construction `ETIQUETTE` dit quelle image
servir. Le paquet du registre doit être **public**, sans quoi la plateforme ne peut pas le
tirer.

Le workflow ne se contente pas de construire : il ouvre le paquet servi et vérifie que les
origines de l'environnement **et** la mise en file des chargements y sont. Une image qui
démarre ne prouve rien — sans ses origines, le pont ne s'installe pas et l'éditeur refuse
d'être encadré, en silence.

### `ORIGINE_PLATEFORME` est obligatoire, et c'est délibéré

C'est **la liste fermée des origines** autorisées à piloter cet éditeur, séparées par des
virgules. Elle est injectée au build.

**Sans elle, le pont ne s'installe pas** et le refus d'encadrement de TurboWarp reste en
place. Il n'y a **aucune valeur par défaut**, et surtout aucun repli sur `'*'` : un `'*'`
livrerait le projet d'un enfant à n'importe quelle page qui aurait encadré cet éditeur.

**Deux origines par environnement**, et c'est l'architecture qui l'impose : le front de
l'élève et l'espace d'administration sont deux applications distinctes qui encadrent le
même éditeur — l'élève pour coder, l'interne pour fabriquer le projet de référence
(`Q314`). Dès qu'un message valide arrive, le pont **se verrouille** sur cette origine-là.

| Environnement | `ORIGINE_PLATEFORME` |
|---|---|
| local | `http://localhost:5190,http://localhost:5170` |
| recette | les deux origines de recette d'Arcade |
| production | les deux origines de production d'Arcade |

### `DEPOT_SOURCE` porte l'offre de source de la GPL, et elle est obligatoire

**Servir cette sortie sur une adresse publique la distribue** : le JavaScript part dans le
navigateur de chaque élève. La GPL-3.0 oblige alors à offrir le source **correspondant**,
c'est-à-dire celui de **cette** version modifiée, et non celui du projet amont.

Le pied de page du projet amont porte bien un lien « Source Code », mais il n'est rendu que
sur la page d'accueil. **Dans l'éditeur encadré, celui que l'élève voit, il n'y a rien.**
D'où le lien ajouté à la barre de menu, rendu exactement quand le pont est actif.

```bash
DEPOT_SOURCE="https://github.com/groupe-trousseau/arcade-editeur-blocs"
```

La valeur par défaut est cette adresse. **Elle doit exister et servir ce dépôt** avant tout
déploiement public : c'est l'offre elle-même, et une offre qui mène à une page absente ne
vaut rien.

## Publier ce dépôt

**La relecture juridique est faite** (prérequis externe 18), et `Q164` était déjà tranché :
on publie, la contrainte de la GPL-3.0 est acceptée.

**Publier et déployer sont un seul geste**, et dans cet ordre. Le lien « Code source » de la
barre de menu est l'offre qu'exige la licence ; une offre qui mène à une page absente ne vaut
rien. Le dépôt doit donc exister **avant** que le sous-domaine serve quoi que ce soit.

```bash
gh repo create groupe-trousseau/arcade-editeur-blocs \
  --public --source=. --remote=arcade --push
```

Le dépôt existe déjà ? Alors :

```bash
git remote add arcade https://github.com/groupe-trousseau/arcade-editeur-blocs.git
git push arcade arcade       # la branche `arcade` porte nos six fichiers
```

**`--public`, et c'est le point** : un dépôt privé ne satisfait pas l'offre de source. Le
nom est celui que `D-003` a tranché, et il ne porte ni « Scratch » ni « MakeCode ».

**`origin` reste l'amont**, pour que la section « Rebaser sur l'amont » continue de marcher.
Notre dépôt est un **second** distant, jamais `origin`.

**L'historique de l'amont part avec.** Ce n'est pas une obligation de la licence, mais c'est
ce qui rend nos modifications lisibles : six fichiers dans un seul commit, sur une base dont
chacun peut vérifier la provenance.

**Une publication ne se retire pas.** C'est pourquoi ce geste appartient au porteur.

## Déployer

Site statique. **Aucun backend, aucune base, aucun cookie.**

| | |
|---|---|
| **recette** | `editeur.recette.l-arcade.fr` |
| **production** | `editeur.l-arcade.fr` |

**Le nom ne porte ni « Scratch » ni « MakeCode »** (`D-003`) : le code est libre, les
marques ne le sont pas.

Servir `build/` tel quel. **`cleanUrls` doit être désactivé** : la plateforme attend
`editor.html`, et un serveur qui réécrit `/editor.html` en `/editor` casse le cadre sans
rien dire. Constaté en local avec `serve`.

**La plateforme de déploiement ne construit plus cette image, elle la tire** : voir
« L'image se construit dans l'intégration continue ». Y reconstruire l'éditeur a rendu un
serveur entier injoignable pendant une heure, le 2026-09-17.

### En-têtes à poser au niveau du proxy

```
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(self)
Cache-Control: public, max-age=31536000, immutable   # sur js/, static/, images/
Cache-Control: no-cache                              # sur *.html
```

**`camera=()` n'est pas négociable** : `F-34` crit. 5 — le système refuse la capture par la
caméra dans les deux éditeurs. **`microphone=(self)` l'est tout autant dans l'autre sens** :
`Q192` ouvre le micro, et sans cette ligne la permission déléguée par la plateforme n'aurait
rien à quoi s'appliquer.

**Pas de `frame-ancestors 'none'` ici** : cet éditeur est fait pour être encadré. Si une
politique de sécurité de contenu est posée, elle doit nommer les origines d'Arcade.

**Pas de `X-Frame-Options`** non plus, pour la même raison.

**Aucun cookie**, et rien qui en pose un. **Pas de listage de répertoire.** **Pas de carte
de source en production** — `NODE_ENV=production` suffit, `SOURCEMAP` non posée.

### La mise en cache

Les bibliothèques de costumes et de sons sont volumineuses (25 Mo de sortie totale). Les
noms de fichiers sont hachés : une année de cache est sûre sur `js/` et `static/`.

## Servir en local, pour l'essai

```bash
cd build && python3 -m http.server 8601 --bind 127.0.0.1
```

Puis, côté Arcade : `VITE_ORIGINE_EDITEUR=http://localhost:8601`.

## Rebaser sur l'amont

```bash
git fetch origin                       # `origin` = TurboWarp/scratch-gui, l'amont
git rebase origin/develop
```

Six fichiers seulement portent nos modifications, et cinq d'entre elles font quelques
lignes. Après un rebase, **rejouer `e2e/e2e-02.spec.ts` d'Arcade** contre le nouveau build :
c'est le seul test qui prouve que le pont traverse encore.

**Ce qui casse le plus probablement à un rebase** : `isInvalidEmbed` dans
`render-interface.jsx`, et l'emplacement du `vm` dans le magasin. Les deux sont signalés
par un commentaire `// Arcade :` dans le code.

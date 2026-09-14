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
| `webpack.config.js` | modifié | injecte `ORIGINE_PLATEFORME` et `DEPOT_SOURCE` par `DefinePlugin` |

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
npx webpack --bail           # sortie statique dans build/
```

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

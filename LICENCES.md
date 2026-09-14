# Licences des dépôts effectivement buildés

**Relevé le 2026-09-14**, sur l'arbre de dépendances réellement installé, en lisant le
champ `license` de chaque `package.json` **et** le fichier `LICENSE` de chaque paquet.

`INTEGRATION-SCRATCH-MAKECODE.md` §D2 en fait une **action préalable, quelle que soit
l'option retenue** : « lire le fichier `LICENSE` de **chaque** dépôt effectivement buildé
et consigner le résultat dans le dépôt de l'éditeur ». C'est ce fichier.

`secure-dependencies` dit la même chose autrement : **tout ce qui entre dans l'artefact
déployé sans avoir été écrit ici est du code étranger**, y compris une image de base et un
binaire natif. Un fork en est le cas extrême — c'est un arbre entier de code étranger, que
nous servons nous-mêmes à des navigateurs d'enfants.

---

## Le fork lui-même

| Dépôt | Version | Commit épinglé | Licence |
|---|---|---|---|
| `TurboWarp/scratch-gui` | 3.2.37 | `a2946eeb9a9dca7857d7ab53d766b54288c7a2ff` (2026-07-29) | **GPL-3.0** |

**C'est la licence qui commande tout le reste.** Servir à un navigateur le JavaScript issu
d'un fork GPL-3.0 **est une distribution du programme** : nous devons offrir aux
utilisateurs le code source correspondant de notre version modifiée, sous GPL-3.0.

`D-003` a tranché : **option A**, fork de TurboWarp, **et notre fork est publié** — après
la relecture juridique du prérequis externe 18, jamais avant. Une publication ne se retire
pas.

## Les dépôts buildés avec lui

Tous sont des dépendances de `scratch-gui` et entrent dans le bundle servi.

| Paquet | Version | Licence déclarée | Fichier `LICENSE` lu |
|---|---|---|---|
| `scratch-vm` | 2.1.46 | **MPL-2.0** | Mozilla Public License 2.0 |
| `scratch-render` | 0.1.0 | **MPL-2.0** | Mozilla Public License 2.0 |
| `scratch-blocks` | 0.1.0 | **GPL-3.0** | GNU GPL v3 |
| `scratch-paint` | 2.1.61 | **GPL-3.0** | GNU GPL v3 |
| `scratch-audio` | 0.1.0 | **BSD-3-Clause** | oui |
| `@turbowarp/scratch-storage` | 2.0.0 | **BSD-3-Clause** | oui |
| `@turbowarp/scratch-svg-renderer` | 1.1.0 | **MPL-2.0** | oui |
| `@turbowarp/scratch-l10n` | 3.1001.202405101234 | **BSD-3-Clause** | oui |
| `@turbowarp/jszip` | 3.12.0 | **MIT OR GPL-3.0-or-later** | oui |

### Les commits épinglés des dépôts tirés de GitHub

`package.json` référence plusieurs dépendances par une branche (`#develop`), ce qui n'est
pas épinglé. **`package-lock.json` l'est**, et c'est lui qui fait foi : il porte le commit
exact de chacun. Un `npm ci` reproduit donc le même arbre ; un `npm install` peut le
déplacer.

| Dépôt | Commit |
|---|---|
| `TurboWarp/scratch-vm` | `c4823421cb7c17d8d8a89878851ce1668c26a21f` |
| `TurboWarp/scratch-blocks` | `4113c5348e6b4c76da9071a1800a62ab96ef793f` |
| `TurboWarp/scratch-render` | `a67f7c9c07d459582c227d4fd3fae8f59d8fc9ce` |
| `TurboWarp/scratch-paint` | `91d109564917e4df31705611a657e773fb23abbb` |
| `TurboWarp/scratch-audio` | `aba00cd02e36d95407effafa03f3678e4c669b30` |
| `TurboWarp/scratch-parser` | `fb65ba09d78ab6a0d19ce908d64b72d1a122312f` |
| `TurboWarp/scratch-render-fonts` | `7b6768fc6dfef6b343a06f992587b74807043961` |

**Le build se fait par `npm ci`, jamais par `npm install`**, pour cette seule raison.

---

## Ce que la licence nous oblige à faire, et ce que nous avons fait

### Conserver les notices

**Aucun fichier `LICENSE` n'a été retiré, et aucune notice de copyright n'a été modifiée.**
Les en-têtes GPL en tête de `src/playground/*.jsx` sont intacts, y compris dans les fichiers
que nous avons modifiés. C'est une obligation des deux licences, et elle ne se négocie pas
au titre du rebranding.

Le fichier ajouté, `src/lib/pont-trousseau.js`, porte **le même en-tête GPL-3.0** : il est
une modification du programme, il en suit la licence.

### Retirer la marque, garder le copyright

Ce sont **deux choses différentes**, et c'est le point que l'on confond :

- la **marque** « Scratch » appartient à la Scratch Foundation, « TurboWarp » à son auteur.
  Le code est libre, **les noms ne le sont pas**. Ils ne paraissent donc nulle part dans
  l'interface de notre éditeur, ni dans le nom du produit, ni dans celui du sous-domaine
  (`D-003`) ;
- le **copyright** et les licences restent écrits dans les fichiers, à l'identique.

Vérifié à l'essai, dans le navigateur, sur l'éditeur encadré par la plateforme :
**zéro occurrence** de « Scratch », « scratch », « TurboWarp » ou « turbowarp » dans le
texte visible du cadre.

### Publier le source

**Pas encore fait, et c'est voulu.** `D-003` : la publication n'a lieu qu'**après** la
relecture juridique du prérequis externe 18. Ce dépôt n'a **aucun dépôt distant de
publication** et n'en aura pas avant cet accord.

Le distant `origin` qu'il porte est celui du **clone d'amont** (`TurboWarp/scratch-gui`),
qui sert aux rebases. Il n'est pas une destination de publication, et rien n'y sera poussé.

---

## Ce qui reste dû sur ce point

1. **La relecture juridique** (prérequis externe 18), qui conditionne la publication.
2. **Le dépôt public** `arcade-editeur-blocs` (prérequis externe 30), à créer après (1).
3. **Une offre de source visible depuis l'éditeur** : la GPL demande que l'utilisateur
   puisse obtenir le source correspondant. Une mention dans les crédits de l'éditeur et
   dans les mentions légales d'Arcade, pointant sur le dépôt public, satisfait cette
   obligation — **elle ne peut être posée qu'une fois (2) fait**, puisqu'elle doit pointer
   quelque part.

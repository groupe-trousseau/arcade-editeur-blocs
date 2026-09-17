/**
 * LE PONT CÔTÉ ÉDITEUR — le seul fichier ajouté à ce fork.
 *
 * Copyright (C) 2026 Groupe Trousseau
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UN SEUL FICHIER AJOUTÉ, ET C'EST DÉLIBÉRÉ. `INTEGRATION-SCRATCH-MAKECODE.md`
 * §4.1 : « Ajouter le pont dans un unique fichier `src/lib/pont-trousseau.js`,
 * importé une fois. Un seul fichier ajouté : c'est ce qui rend les rebases sur
 * l'upstream tenables. »
 *
 * Les trois autres fichiers du fork sont seulement MODIFIÉS, de quelques
 * lignes chacun, et le `README.md` les nomme un par un.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES TROIS RÈGLES NON NÉGOCIABLES (§4.2)
 *
 *   1. `postMessage` avec l'origine cible EXPLICITE, jamais `'*'`, dans les
 *      deux sens ;
 *   2. contrôle de `e.origin` à la réception, dans les deux sens ;
 *   3. le pont ne fait AUCUN `fetch`. L'éditeur ne connaît ni l'URL de l'API,
 *      ni jeton, ni session : toute persistance passe par la fenêtre parente,
 *      qui est authentifiée (D3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * L'ORIGINE DE LA PLATEFORME, INJECTÉE AU BUILD.
 *
 * `webpack.config.js` la pose par `DefinePlugin` depuis la variable
 * d'environnement `ORIGINE_PLATEFORME`. Elle n'a **aucune valeur par défaut
 * utile** : sans elle, le pont refuse de s'installer et le dit dans la console,
 * plutôt que de retomber sur `'*'` et d'ouvrir l'éditeur à n'importe quelle page
 * qui l'encadre.
 */
const ORIGINES_DECLAREES = (process.env.ORIGINE_PLATEFORME || '')
    .split(',')
    .map(origine => origine.trim())
    .filter(origine => origine.length > 0);

/**
 * POURQUOI UNE LISTE, ET NON UNE SEULE ORIGINE.
 *
 * Le document d'intégration écrit une origine unique. Un environnement d'Arcade
 * en porte **deux**, et c'est l'architecture qui l'impose : le front de l'élève
 * et l'espace d'administration sont deux applications distinctes, à deux
 * origines distinctes, et toutes deux encadrent le MÊME éditeur — l'élève pour
 * coder, l'interne pour fabriquer le projet de référence (`Q314`).
 *
 * La liste reste **fermée et déclarée au build**. Ce n'est pas un
 * assouplissement de la règle : `'*'` n'apparaît nulle part, chaque message
 * entrant est vérifié contre la liste, et chaque message sortant part vers une
 * origine nommée. Dès qu'un message valide arrive, le pont **se verrouille**
 * sur cette origine-là et ne parle plus qu'à elle.
 */

/** Le paramètre d'URL qui met l'éditeur en LECTEUR : la scène seule. */
const PARAMETRE_LECTEUR = 'lecteur';

const parametres = new URLSearchParams(
    typeof location === 'undefined' ? '' : location.search
);

/** Vrai quand la page est encadrée par une plateforme qui a déclaré son origine. */
export const PONT_ACTIF = ORIGINES_DECLAREES.length > 0;

/**
 * L'ADRESSE DU SOURCE DE CETTE VERSION MODIFIÉE.
 *
 * GPL-3.0 : servir cette sortie sur une adresse publique la distribue, et la
 * licence oblige alors à offrir le source **correspondant** — celui d'ici, pas
 * celui du projet amont. Le lien est rendu dans la barre de menu, parce que le
 * pied de page qui porte l'offre du projet amont **ne s'affiche que sur la page
 * d'accueil** : dans l'éditeur encadré, l'élève ne le voit jamais.
 *
 * Elle se règle au build par `DEPOT_SOURCE`, comme l'origine de la plateforme.
 */
export const DEPOT_SOURCE = process.env.DEPOT_SOURCE || '';

/** Vrai en mode lecteur : `?lecteur=1`. La scène, le drapeau vert, rien d'autre. */
export const MODE_LECTEUR = parametres.get(PARAMETRE_LECTEUR) === '1';

/**
 * LES PROPRIÉTÉS À PASSER À L'INTERFACE, selon le mode.
 *
 * En LECTEUR : `isPlayerOnly` et `isFullScreen`, exactement ce que l'entrée
 * `fullscreen.jsx` de ce dépôt passe déjà — la scène et le drapeau vert, sans
 * palette, sans boîte à blocs, sans menu.
 *
 * En ÉDITEUR : les entrées de menu dangereuses en contexte scolaire sont
 * fermées une par une (§4.1, point 2) — connexion et compte, partage
 * communautaire, enregistrement chez un tiers, création d'un projet vide qui
 * écraserait le travail en cours, changement du titre, qui n'a aucun sens quand
 * le projet est nommé par le niveau.
 *
 * **Le chargement depuis une URL arbitraire est fermé ailleurs**, par
 * `enableCommunity: false` et par l'absence de la page d'accueil : en mode
 * encadré `isHomepage` est faux, donc ni le champ d'adresse de projet, ni la
 * galerie ne sont rendus.
 *
 * @returns {object} les propriétés à passer à `<Interface>`.
 */
export const proprietesDeLInterface = () => {
    if (MODE_LECTEUR) {
        return {
            isPlayerOnly: true,
            isFullScreen: true,
            canUseCloud: false,
            enableCommunity: false
        };
    }

    return {
        canUseCloud: false,
        hasCloudPermission: false,
        enableCommunity: false,
        canSave: false,
        canShare: false,
        canRemix: false,
        canCreateCopy: false,
        canCreateNew: false,
        canEditTitle: false,
        canManageFiles: false,
        backpackVisible: false,
        enableSeeInside: false
    };
};

/**
 * INSTALLE LE PONT. Appelé une fois, avec le `vm` du magasin.
 *
 * Rend la fonction qui démonte l'écoute, pour que l'installation soit
 * idempotente et qu'un rendu en double n'inscrive pas deux écouteurs.
 *
 * @param {object} vm la machine virtuelle de Scratch, prise dans le magasin.
 * @returns {Function} la fonction qui démonte l'écoute.
 */
export const installerPont = vm => {
    if (!PONT_ACTIF) {
        // Pas d'origine déclarée : on n'ouvre rien. Le message part dans la
        // console de l'éditeur, jamais vers le parent — on ne sait pas à qui on
        // parlerait.
        // eslint-disable-next-line no-console
        console.warn(
            '[pont-trousseau] ORIGINE_PLATEFORME absente du build : le pont ne s’installe pas.'
        );
        return () => {};
    }

    if (window.parent === window) {
        // Ouvert hors cadre : il n'y a personne à qui parler.
        return () => {};
    }

    // L'origine sur laquelle le pont s'est verrouillé, au premier message
    // valide reçu. Tant qu'elle est nulle, un envoi part vers CHAQUE origine
    // déclarée — la liste est fermée, courte, et écrite au build.
    let origineVerrouillee = null;

    const envoyer = (message, transferables) => {
        const cibles = origineVerrouillee ? [origineVerrouillee] : ORIGINES_DECLAREES;
        for (const cible of cibles) {
            // Origine cible EXPLICITE. Jamais `'*'`.
            window.parent.postMessage(message, cible, transferables || []);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LES CHARGEMENTS PASSENT EN FILE, DERRIÈRE LE PROJET PAR DÉFAUT.
    //
    // TurboWarp charge SON projet par défaut au démarrage, sans rien savoir du
    // pont, et la plateforme pousse son projet dès `trousseau:pret`. Deux
    // `vm.loadProject` concurrents FUSIONNENT : chacun vide le runtime au début
    // (`deserializeProject`) et ajoute ses cibles à la fin (`installTargets`),
    // sans revider. Mesuré dans Arcade (arcade#87) : deux scènes, le sprite par
    // défaut et celui de l'élève dans le même projet, un sprite vide de plus à
    // chaque ouverture — ou, quand l'ordre s'inverse, le projet par défaut À LA
    // PLACE de celui de l'élève.
    //
    // La file a donc pour premier maillon le chargement du projet par défaut :
    // un `trousseau:charger` passe derrière lui, puis derrière le précédent, et
    // REMPLACE ce qui est à l'écran au lieu de s'y ajouter. Un rendu attend
    // aussi la file : il sérialise un projet entier, jamais un projet à moitié
    // posé.
    //
    // `PROJECT_LOADED` est émis par `vm.runtime`, et non par le `vm`, qui ne le
    // relaie pas. Des cibles déjà présentes veulent dire que le projet par
    // défaut est posé : il n'y a rien à attendre.
    // ─────────────────────────────────────────────────────────────────────────
    let file = Promise.resolve();
    const enFile = travail => {
        const resultat = file.then(travail);
        file = resultat.then(() => null, () => null);
        return resultat;
    };

    // Les chargements en file ou en cours, celui du projet par défaut compris.
    // Tant qu'il en reste un, une modification n'est pas un geste de l'élève.
    let chargements = 0;
    const compter = chargement => {
        chargements += 1;
        const fin = () => {
            chargements -= 1;
        };
        chargement.then(fin, fin);
        return chargement;
    };

    if (vm.runtime.targets.length === 0) {
        const projetParDefaut = new Promise(resoudre => vm.runtime.once('PROJECT_LOADED', resoudre));
        compter(enFile(() => projetParDefaut));
    }

    // Un projet vide vaut « page blanche » (`F-34`, `Q197`) : l'élève part du
    // projet par défaut, et c'est le cahier des charges qui le demande.
    // `vm.loadProject` refuserait zéro octet.
    const charger = octets => compter(enFile(() => (
        octets && octets.byteLength > 0 ? vm.loadProject(octets) : null
    )));

    const surMessage = async e => {
        // Contrôle d'origine à la réception. Obligatoire.
        if (!ORIGINES_DECLAREES.includes(e.origin)) return;
        origineVerrouillee = e.origin;

        const message = e.data;
        if (!message || typeof message.type !== 'string') return;

        if (message.type === 'trousseau:charger') {
            try {
                await charger(message.projet);
                envoyer({type: 'trousseau:charge'});
            } catch (erreur) {
                envoyer({
                    type: 'trousseau:erreur',
                    sur: 'charger',
                    message: String(erreur && erreur.message ? erreur.message : erreur)
                });
            }
            return;
        }

        if (message.type === 'trousseau:demander-rendu') {
            try {
                const blob = await enFile(() => vm.saveProjectSb3());
                const octets = await blob.arrayBuffer();
                // 3e argument : la liste des transférables, qui évite une copie
                // du tampon. Un `.sb3` d'élève avec des sons enregistrés au
                // micro se compte en dizaines de mégaoctets.
                envoyer(
                    {
                        type: 'trousseau:rendu',
                        projet: octets,
                        correlationId: message.correlationId
                    },
                    [octets]
                );
            } catch (erreur) {
                envoyer({
                    type: 'trousseau:erreur',
                    sur: 'demander-rendu',
                    correlationId: message.correlationId,
                    message: String(erreur && erreur.message ? erreur.message : erreur)
                });
            }
        }
    };

    window.addEventListener('message', surMessage);

    // Signal de modification, qui pilote la sauvegarde automatique côté parent.
    // Le pont n'écrit rien lui-même : il signale, et c'est la plateforme
    // authentifiée qui décide d'enregistrer.
    //
    // **SILENCE PENDANT UN CHARGEMENT.** `scratch-vm` émet `PROJECT_CHANGED`
    // pour chaque bloc qu'il crée en chargeant un projet : relayés, ces signaux
    // faisaient enregistrer la plateforme à l'ouverture, sans aucun geste de
    // l'élève (arcade#85, arcade#87).
    const surModification = () => {
        if (chargements === 0) envoyer({type: 'trousseau:modifie'});
    };
    if (!MODE_LECTEUR) {
        vm.on('PROJECT_CHANGED', surModification);
    }

    // Signal de vie : le parent sait quand l'iframe est prête à recevoir. Il
    // part EN DERNIER, une fois l'écoute posée, sans quoi un `charger` immédiat
    // se perdrait.
    envoyer({type: 'trousseau:pret', lecteur: MODE_LECTEUR});

    return () => {
        window.removeEventListener('message', surMessage);
        if (!MODE_LECTEUR) {
            vm.off('PROJECT_CHANGED', surModification);
        }
    };
};

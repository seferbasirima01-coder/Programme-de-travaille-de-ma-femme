# Programme-de-travaille-de-ma-femme

Application web progressive (PWA) en français pour consulter un calendrier de service et de repos. Elle fonctionne sans framework ni installation de dépendances.

## Fonctionnalités

- Calendrier mensuel avec navigation, recherche de date et aperçu des prochaines relèves.
- Paramètres du cycle enregistrés localement dans le navigateur.
- Export iCalendar (.ics), impression PDF et installation PWA.
- Repères de bien-être et préparation facultative d’un message WhatsApp.
- Interface responsive, avec couleurs distinctes pour le service et le repos.

## Structure

```text
index.html                 Structure et contenu de l’application
style.css                  Palette, composants et adaptation mobile
script.js                  Calendrier, interactions et stockage local
sw.js                      Mise en cache hors ligne
manifest.webmanifest       Configuration de la PWA
icons/app-icon.svg          Icône de l’application
scripts/verifier.ps1        Vérifications locales rapides
```

## Vérifier et lancer sous Windows

Dans PowerShell, depuis le dossier du projet :

```powershell
.\scripts\verifier.ps1
py -m http.server 8765
```

Ouvrez ensuite <http://localhost:8765> dans le navigateur. Arrêtez le serveur avec `Ctrl+C`.

Le script vérifie la syntaxe JavaScript, le manifeste PWA et la présence des fichiers nécessaires. Pour une vérification manuelle rapide, utilisez aussi `node --check .\script.js`.

## Données et rappels

Les paramètres de cycle, la date de grossesse et le numéro WhatsApp restent dans le stockage local du navigateur. Les notifications ne fonctionnent que si le navigateur les autorise et si l’application est ouverte le jour du rappel. Le message WhatsApp doit être vérifié et envoyé par l’utilisateur.

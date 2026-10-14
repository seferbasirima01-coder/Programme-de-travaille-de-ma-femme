# Installer Mon rythme sur un téléphone

## 1. Publier l’application sur une adresse HTTPS

L’installation et le mode hors ligne nécessitent une adresse web sécurisée (`https://`). Le double-clic sur `index.html` continue à fonctionner sur l’ordinateur, mais ne permet pas l’installation sur le téléphone.

Publiez le contenu complet de ce dossier sur un hébergement de fichiers statiques HTTPS. Conservez les fichiers et dossiers ensemble, en particulier `manifest.webmanifest`, `sw.js` et `icons/app-icon.svg`. Après publication, vérifiez que l’adresse HTTPS ouvre bien le calendrier.

**Confidentialité :** la date de départ du cycle par défaut est encore inscrite dans le code pour conserver le fonctionnement immédiat sur ordinateur. Un site statique public rend son code consultable. N’hébergez donc pas cette version sur un dépôt ou une adresse publique avant de protéger l’accès ou de déplacer ce réglage vers une configuration saisie sur chaque téléphone.

## 2. Ajouter l’application à l’écran d’accueil

- **Android** : ouvrez l’adresse dans Chrome, puis choisissez **Installer l’application** (ou **Ajouter à l’écran d’accueil**). Le bouton d’installation peut aussi apparaître dans l’application.
- **iPhone** : ouvrez l’adresse dans Safari, touchez **Partager**, puis **Sur l’écran d’accueil** et **Ajouter**.

Ouvrez l’application une première fois avec Internet pour mettre ses fichiers en cache. Elle pourra ensuite s’ouvrir hors ligne sur cet appareil.

## Données et rappels

Les réglages, la date de grossesse et le numéro WhatsApp sont conservés dans le navigateur de chaque appareil, sans compte ni synchronisation. Saisissez donc le numéro sur le téléphone de votre femme si nécessaire. Le numéro n’est pas inclus dans les fichiers publiables.

Les notifications du navigateur demandent une autorisation et l’application doit être ouverte le jour du rappel. L’envoi de messages WhatsApp doit toujours être confirmé manuellement.

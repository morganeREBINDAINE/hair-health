# Règles projet

## Workflow

- Il faut commit à la fin de toute tâche terminée.
- Pour tout commit, utiliser le skill commit-feature.
- Réfère toi toujours aux bonnes pratiques d'architecture de projet React Native.
- Affiche toujours dans l'application les erreurs liées aux données entrées dans les formulaires, ainsi que liées aux requêtes asynchrones.
- Pour toute opération de base de données, consulter `docs/STORAGE.md` et t'y conformer.
- Avant toute implémentation de fonctionnalité, vérifie le code actuel, prépare un plan, fais le moi valider et propose moi les choix architecturaux si il y en a. Ne modifie jamais de code sans mon feu vert.
- Une action utilisateur qui nécessite une requête asynchrone doit afficher un loader jusqu'à obtention de la réponse. Il faut bloquer le trigger qui déclenche la requête asynchrone tant que le loader est affiché.
- Tu peux tester l'affichage des pages et composants, mais pas les fonctionnalités qui nécessitent une connexion à internet. Dans ce cas précis, décris moi les tests à effectuer manuellement, et je le fais moi même. Chaque test manuel doit indiquer : les étapes numérotées, le résultat attendu, et le cas d'erreur à provoquer (ex. couper le réseau pendant une sauvegarde pour vérifier le loader et le message d'erreur).

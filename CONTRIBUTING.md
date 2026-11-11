# Contribuer à la documentation OpenBastion

Merci de contribuer à la documentation OpenBastion. Ce dépôt publie le site VitePress du projet ; la majorité du contenu technique est synchronisée depuis [openbastion/openbastion](https://github.com/openbastion/openbastion).

## Où modifier le contenu

- Les pages techniques sous `docs/` proviennent du dépôt principal. Modifiez-les dans `openbastion/openbastion/docs/`, puis synchronisez-les ici avec `scripts/sync-docs.sh`.
- Les fichiers propres au site sont `docs/index.md`, `docs/public/` et `docs/.vitepress/`.
- Les politiques de ce dépôt et les workflows sont maintenus à la racine et sous `.github/`.

Ne corrigez pas directement une page synchronisée ici : une synchronisation ultérieure peut remplacer cette modification.

## Parcours de contribution

1. Ouvrez une issue pour les changements substantiels.
2. Créez une branche dédiée depuis `main`.
3. Gardez chaque pull request centrée sur un objectif cohérent.
4. Ajoutez ou actualisez les tests et la documentation concernés.
5. Exécutez les contrôles avant de soumettre la pull request :

   ```bash
   npm ci
   npm run docs:check
   npm run docs:build
   ```

6. Vérifiez le diff : pas de secret, donnée personnelle, fichier généré inutile ou changement sans rapport.
7. Ouvrez une pull request vers `main` et décrivez les contrôles exécutés.

## DCO — Developer Certificate of Origin

Chaque commit soumis doit être signé au moyen du trailer DCO `Signed-off-by`. Il certifie que vous avez le droit de soumettre cette contribution selon les termes de la déclaration DCO.

Utilisez `git commit -s` pour ajouter automatiquement le trailer correspondant à votre identité Git configurée :

```text
Signed-off-by: Prénom Nom <adresse-email>
```

Chaque commit de la pull request doit contenir son propre trailer. Un trailer ajouté uniquement au dernier commit ne signe pas les commits précédents. La vérification DCO de la CI bloque une pull request dont au moins un commit ne comporte pas de sign-off valide.

Le DCO est une attestation de provenance et de droits de contribution ; ce n'est pas une signature cryptographique GPG ou SSH.

## Qualité et sécurité

- N'introduisez pas de liens vers des ressources privées ou des secrets.
- N'affirmez pas qu'une fonctionnalité est disponible si elle est seulement planifiée.
- Distinguez les comportements implémentés, expérimentaux et prévus.
- Pour les changements de sécurité, décrivez le risque traité et les limites connues.
- Ne publiez pas de vulnérabilité exploitable dans une issue ou une pull request publique : suivez [SECURITY.md](SECURITY.md).

## Licence

Les contributions à ce dépôt sont publiées sous **GNU Affero General Public License v3.0 only (AGPL-3.0-only)**, sauf mention explicite différente applicable à un élément tiers. En soumettant une contribution, vous acceptez sa distribution sous cette licence. Vous conservez vos droits d'auteur sur votre contribution.

Ne soumettez que du contenu que vous avez le droit de publier. Déclarez clairement l'origine et la licence de tout extrait, image, diagramme ou autre élément tiers.

## Revue

Les mainteneurs peuvent demander des modifications, des précisions ou des validations supplémentaires. Une pull request n'est fusionnée qu'après revue et réussite des contrôles obligatoires configurés sur le dépôt.

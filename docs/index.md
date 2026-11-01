---
layout: home

hero:
  name: OpenBastion
  text: Accès à privilèges, proxifiés et audités
  tagline: "PAM open source, cloud-native, écrit en Go. L’opérateur n’a jamais le mot de passe de la cible : toute connexion passe par un proxy, toute session est enregistrée et auditée."
  actions:
    - theme: brand
      text: Lire la documentation
      link: /documentation
    - theme: alt
      text: Feuille de route
      link: /roadmap
    - theme: alt
      text: Code source
      link: https://github.com/openbastion/openbastion

features:
  - title: Le secret ne traverse jamais le control plane
    details: Seul un proxy authentifié par mTLS échange un jeton de scope à usage unique contre un credential éphémère, directement auprès du Vault. Le control plane autorise ; il ne voit jamais le secret (ADR-0003).
  - title: Zero Standing Privilege
    details: Aucun mot de passe permanent entre les mains d’un opérateur. Le credential est éphémère, le scope à usage unique, la rotation planifiée ou après usage, le chiffrement en enveloppe AES-256-GCM.
  - title: Full Auditability
    details: "Journal d’audit chaîné et à clé (HMAC) : une ligne modifiée, déplacée ou recalculée se détecte. Les commandes d’une session sont chiffrées au repos et rejouables en texte."
  - title: Premier incrément vertical
    details: Le dépôt contient la tranche qui prouve l’invariant — SSH, SFTP et SCP de bout en bout. Le reste du périmètre est séquencé sur la feuille de route, pas encore construit.
---

## Par public

| Vous êtes… | Commencez par |
|---|---|
| Opérateur — vous demandez et utilisez une session | [Guide utilisateur](/user-guide/) |
| Administrateur de la plateforme | [Déploiement](/deployment/), puis [Administration](/administration/) |
| Responsable sécurité, auditeur | [Sécurité](/security/), [Audit et conformité](/administration/audit-and-compliance), [Conformité](/compliance/) |
| SRE, exploitation | [Haute disponibilité](/deployment/high-availability), [Reprise d’activité](/deployment/disaster-recovery), [Exploitation](/operations/) |
| Contributeur | [Développement](/development/), [Architecture](/architecture/), [ADR](/adr/), [API](/api/) |

## État du projet

OpenBastion est en cours d’implémentation du MVP (version `0.0.1-dev`, licence Apache 2.0). Ce que décrit cette documentation est ce que fait le code ; ce qui est prévu sans être construit est listé sur la [feuille de route](/roadmap) et dans les index de section.

- Les garanties que le MVP tient réellement : [Vue d’ensemble de la sécurité](/security/security-overview)
- **Ce que le MVP ne garantit pas encore** — à lire avant toute mise en production : [Limites connues](/security/known-limitations)
- L’état réel, les chiffres de tests et les écarts assumés : [NOTES_SANDBOX.md](https://github.com/openbastion/openbastion/blob/main/NOTES_SANDBOX.md)

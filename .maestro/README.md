# Maestro

The flows require seeded, email-confirmed staging accounts supplied through environment variables. Run them against an installed preview build:

```bash
maestro test .maestro -e CLIENT_EMAIL=... -e CLIENT_PASSWORD=...
```

Store credentials in CI secrets, never in YAML. Provider confirmation, completion, review, venue stay, moderation, password reset, and account-deletion flows should be enabled after staging seed identities and SMTP are configured.

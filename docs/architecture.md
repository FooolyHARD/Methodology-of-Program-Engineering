# Architecture Notes

## Boundary

MVP реализован как modular monolith на Spring Boot с внутренними границами будущей MSA:

- `common` - роли, текущий пользователь, обработка ошибок;
- `funds` - поступления и партии средств;
- `baseline` - рестораны и business baseline;
- `planning` - расчет и утверждение плана распределения;
- `cash` - генерация синтетических кассовых операций;
- `audit` - журнал действий;
- `dashboard` - агрегированное состояние для UI.

Такой подход сохраняет архитектурные границы SRS/SDP и уменьшает инфраструктурную сложность учебного MVP.

## Implemented Use Cases

1. Use Case ID 2: registration of fund intake.
2. Use Case ID 3: distribution plan creation and approval.
3. Use Case ID 4: synthetic cash operation generation.

## Extension Points

- Keycloak replaces `X-Demo-Role`.
- RabbitMQ can be connected for async plan/operation events.
- Redis can be used for dashboard/status caching.
- POS emulator can consume generated operations from `cash` module.
- Logstash/Sentry can consume structured application logs/errors.

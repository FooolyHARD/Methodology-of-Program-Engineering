# PollosFlow MVP 0.5

Учебная реализация трех архитектурно значимых сценариев из SRS/Use Case:

- регистрация поступления средств;
- формирование плана распределения по ресторанам на основе business baseline;
- генерация синтетических кассовых операций по утвержденному плану.

Реализация является учебным симулятором на синтетических данных. Реальных POS/банковских интеграций и механизмов сокрытия операций здесь нет.

## Стек

- Backend: Java 17, Spring Boot, Spring Security, OAuth2 Resource Server, Spring Data JPA, Flyway, OpenAPI/Swagger.
- Database: PostgreSQL 14+ в основном профиле.
- Infra: Redis, RabbitMQ, Keycloak через `docker-compose.yml`.
- Frontend: React, TypeScript, Yarn, Material UI.

## Запуск с инфраструктурой

```bash
docker compose up -d postgres redis rabbitmq keycloak
cd backend
./mvnw spring-boot:run
cd ../frontend
yarn dev
```

Backend: `http://localhost:8080`

Swagger UI: `http://localhost:8080/swagger-ui.html`

Frontend: `http://localhost:5173`

Keycloak: `http://localhost:8081`

RabbitMQ Management: `http://localhost:15672` (`guest` / `guest`)

Если Keycloak уже был запущен до появления realm import, пересоздай контейнер:

```bash
docker compose up -d --force-recreate keycloak
```

## Локальный dev-запуск backend без Docker

Если Docker Desktop не запущен, можно поднять backend на H2 только для быстрой проверки API и сборки:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Полный frontend-login использует Keycloak, поэтому для end-to-end сценария нужен Docker-контур с Keycloak.
Основной профиль приложения настроен на PostgreSQL.

## Аутентификация и роли

Frontend получает access token в Keycloak realm `pollosflow` и вызывает backend с `Authorization: Bearer ...`.
Backend читает роли из `realm_access.roles`.

Стартовые пользователи:

- `owner` / `owner123` - `OWNER`
- `admin` / `admin123` - `ADMIN`
- `authorized` / `authorized123` - `AUTHORIZED_USER`
- `cashier` / `cashier123` - `CASHIER`
- `accountant` / `accountant123` - `ACCOUNTANT`

Пользователь не регистрируется самостоятельно. Owner создает аккаунты в UI, backend синхронизирует их с локальной БД и Keycloak.

## Сообщения

RabbitMQ подключен как доменная шина событий. Каждый audit event сохраняется в БД и публикуется:

- exchange: `pollosflow.events`
- queue: `pollosflow.audit-events`
- routing key: `pollosflow.audit.event`

## Проверки

```bash
cd backend && ./mvnw test
cd frontend && yarn build
```

Flyway/JPA также проверяются тестовым профилем на H2 в PostgreSQL-mode.

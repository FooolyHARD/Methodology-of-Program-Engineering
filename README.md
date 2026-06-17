# PollosFlow MVP 0.5

Учебная реализация трех архитектурно значимых сценариев из SRS/Use Case:

- регистрация поступления средств;
- формирование плана распределения по ресторанам на основе business baseline;
- генерация синтетических кассовых операций по утвержденному плану.

Реализация является учебным симулятором на синтетических данных. Реальных POS/банковских интеграций и механизмов сокрытия операций здесь нет.

## Стек

- Backend: Java 17, Spring Boot, Spring Data JPA, Flyway, OpenAPI/Swagger.
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

## Локальный dev-запуск без Docker

Если Docker Desktop не запущен, можно поднять backend на H2 только для демонстрации UI/API:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
cd ../frontend
yarn dev
```

Основной профиль приложения все равно настроен на PostgreSQL.

## Ролевая модель MVP

До полноценной интеграции с Keycloak роль передается через заголовок:

```http
X-Demo-Role: OWNER
```

Frontend переключает этот заголовок через selector роли. Это точка замены на Keycloak в следующем релизе.

## Проверки

```bash
cd backend && ./mvnw test
cd frontend && yarn build
```

В текущем окружении Docker daemon был недоступен, поэтому PostgreSQL-контур не был поднят локально. Flyway/JPA проверены тестовым профилем на H2 в PostgreSQL-mode.

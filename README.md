# PyroAlert

PyroAlert is a fire and environmental monitoring project. The code currently in the repository implements a Node.js backend that reads device telemetry over MQTT, saves readings to PostgreSQL, and broadcasts them to connected dashboards with Socket.IO.

## Project structure

- `backend/` — Express API, PostgreSQL connection, and MQTT/Socket.IO integration.
- `database/` — reserved for database setup files; no schema or migrations are included yet.
- `esp32/` — reserved for ESP32 firmware; no firmware files are included yet.
- `frontend/` — reserved for the dashboard; no frontend files are included yet.
- `docs/` — reserved for project documentation.

## Requirements

- Node.js and npm
- PostgreSQL
- An MQTT broker (for example, a local Mosquitto broker)

## Backend setup

In PowerShell, from the project root:

```powershell
cd backend
Copy-Item .env.example .env
npm install
```

Edit `backend/.env` and set the PostgreSQL credentials and MQTT broker address for your environment. The example defaults assume PostgreSQL at `localhost:5432` and an MQTT broker at `localhost:1883`.

The backend expects a PostgreSQL database with a `devices` table containing `device_id`, `device_name`, `device_code`, `location`, `status`, `last_seen`, and `created_at` columns, and a `sensor_readings` table containing `reading_id`, `device_id`, `temperature`, `humidity`, `smoke_value`, and `flame_detected` columns. No schema or migration files are currently provided.

Start the backend in development mode (auto-restarts on file changes):

```powershell
npm run dev
```

Or start it normally:

```powershell
npm start
```

The API listens on port `5000` by default. Override this with `PORT` in `.env`.

## API

- `GET /api/health` — returns backend status and a timestamp.
- `GET /api/devices` — lists registered devices.
- `GET /api/devices/:id` — returns a device by numeric ID.

## Device telemetry

The backend subscribes to `pyroalert/devices/+/telemetry` at QoS 1. Publish a JSON message with this shape, replacing `{device_code}` in the topic with a registered device's code:

```json
{
  "temperature": 24.5,
  "humidity": 45,
  "smoke_value": 120,
  "flame_detected": false
}
```

Temperature must be between -40 and 125, humidity between 0 and 100, `smoke_value` an integer between 0 and 4095, and `flame_detected` a boolean. Valid readings update the device's online status and last-seen time, are saved to PostgreSQL, and are broadcast to connected Socket.IO clients as the `sensor:reading` event.

## Configuration

See `backend/.env.example` for the available settings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `5000` |
| `FRONTEND_URL` | Socket.IO allowed origin | `*` |
| `DB_HOST` | PostgreSQL host | — |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | PostgreSQL database name | — |
| `DB_USER` | PostgreSQL username | — |
| `DB_PASSWORD` | PostgreSQL password | — |
| `MQTT_BROKER_URL` | MQTT broker URL | `mqtt://localhost:1883` |
| `MQTT_CLIENT_ID` | MQTT client ID | `pyroalert_backend` |
| `MQTT_USERNAME` | Optional MQTT username | — |
| `MQTT_PASSWORD` | Optional MQTT password | — |

Keep credentials in `.env`; do not commit that file.

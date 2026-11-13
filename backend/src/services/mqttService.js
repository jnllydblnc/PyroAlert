
import mqtt from "mqtt";
import { pool } from "../config/database.js";

// ==========================================
// PYROALERT MQTT CONFIGURATION
// ==========================================

const TELEMETRY_TOPIC = "pyroalert/devices/+/telemetry";

// Initial prototype thresholds.
// These values require hardware testing and calibration.
const SMOKE_ALERT_THRESHOLD = Number(
  process.env.SMOKE_ALERT_THRESHOLD || 1800
);

const TEMPERATURE_ALERT_THRESHOLD = Number(
  process.env.TEMPERATURE_ALERT_THRESHOLD || 45
);

// ==========================================
// ALERT PROCESSING
// ==========================================

async function processAlerts(io, deviceId, deviceCode, data) {
  const conditions = [];

  // 1. Flame detection
  if (data.flame_detected === true) {
    conditions.push({
      type: "FLAME_DETECTED",
      severity: "critical",
      message: "Flame detected by the PyroAlert sensor."
    });
  }

  // 2. Smoke detection
  if (data.smoke_value >= SMOKE_ALERT_THRESHOLD) {
    conditions.push({
      type: "HIGH_SMOKE",
      severity: "high",
      message: `High smoke reading detected: ${data.smoke_value}.`
    });
  }

  // 3. High temperature detection
  if (data.temperature >= TEMPERATURE_ALERT_THRESHOLD) {
    conditions.push({
      type: "HIGH_TEMPERATURE",
      severity: "high",
      message: `High temperature detected: ${data.temperature} °C.`
    });
  }

  const activeTypes = conditions.map(
    (condition) => condition.type
  );

  // ==========================================
  // INSERT NEW ALERTS
  // ==========================================

  for (const condition of conditions) {
    const result = await pool.query(
      `
      INSERT INTO alerts (
        device_id,
        alert_type,
        severity,
        message,
        status
      )
      SELECT
        $1::integer,
        $2::varchar(50),
        $3::varchar(20),
        $4::text,
        'active'
      WHERE NOT EXISTS (
        SELECT 1
        FROM alerts
        WHERE device_id = $1::integer
          AND alert_type = $2::varchar(50)
          AND status = 'active'
      )
      RETURNING *
      `,
      [
        deviceId,
        condition.type,
        condition.severity,
        condition.message
      ]
    );

    if (result.rowCount > 0) {
      const alert = {
        device_code: deviceCode,
        ...result.rows[0]
      };

      console.log("New alert generated:", alert);

      // Notify connected dashboard clients.
      io.emit("alert:new", alert);
    }
  }

  // ==========================================
  // RESOLVE INACTIVE ALERTS
  // ==========================================

  const resolvedResult = await pool.query(
    `
    UPDATE alerts
    SET
      status = 'resolved',
      resolved_at = CURRENT_TIMESTAMP
    WHERE device_id = $1::integer
      AND status = 'active'
      AND NOT (
        alert_type = ANY($2::varchar[])
      )
    RETURNING *
    `,
    [deviceId, activeTypes]
  );

  for (const alert of resolvedResult.rows) {
    const resolvedAlert = {
      device_code: deviceCode,
      ...alert
    };

    console.log("Alert resolved:", resolvedAlert);

    io.emit("alert:resolved", resolvedAlert);
  }
}

// ==========================================
// MQTT INITIALIZATION
// ==========================================

export function initializeMqtt(io) {
  const options = {
    clientId:
      process.env.MQTT_CLIENT_ID || "pyroalert_backend",

    reconnectPeriod: 5000,
    connectTimeout: 30000
  };

  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
  }

  if (process.env.MQTT_PASSWORD) {
    options.password = process.env.MQTT_PASSWORD;
  }

  const client = mqtt.connect(
    process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    options
  );

  // ==========================================
  // MQTT CONNECTION
  // ==========================================

  client.on("connect", () => {
    console.log("Connected to MQTT broker.");

    client.subscribe(
      TELEMETRY_TOPIC,
      { qos: 1 },
      (error) => {
        if (error) {
          console.error(
            "MQTT subscription failed:",
            error.message
          );
          return;
        }

        console.log(
          `Subscribed to MQTT topic: ${TELEMETRY_TOPIC}`
        );
      }
    );
  });

  client.on("reconnect", () => {
    console.log("Reconnecting to MQTT broker...");
  });

  client.on("offline", () => {
    console.log("MQTT client is offline.");
  });

  client.on("error", (error) => {
    console.error(
      "MQTT connection error:",
      error.message
    );
  });

  // ==========================================
  // RECEIVE SENSOR TELEMETRY
  // ==========================================

  client.on("message", async (topic, message) => {
    try {
      // Extract device code from MQTT topic.
      const topicParts = topic.split("/");

      if (
        topicParts.length !== 4 ||
        topicParts[0] !== "pyroalert" ||
        topicParts[1] !== "devices" ||
        topicParts[3] !== "telemetry"
      ) {
        return;
      }

      const deviceCode = topicParts[2];

      // Parse incoming JSON.
      const data = JSON.parse(message.toString());

      const {
        temperature,
        humidity,
        smoke_value,
        flame_detected
      } = data;

      console.log(
        `Telemetry received from ${deviceCode}`
      );

      // ==========================================
      // VALIDATE SENSOR DATA
      // ==========================================

      if (
        !Number.isFinite(temperature) ||
        temperature < -40 ||
        temperature > 125 ||

        !Number.isFinite(humidity) ||
        humidity < 0 ||
        humidity > 100 ||

        !Number.isInteger(smoke_value) ||
        smoke_value < 0 ||
        smoke_value > 4095 ||

        typeof flame_detected !== "boolean"
      ) {
        console.error(
          "Invalid sensor data:",
          deviceCode,
          data
        );

        return;
      }

      // ==========================================
      // UPDATE DEVICE AND SAVE SENSOR READING
      // ==========================================

      const result = await pool.query(
        `
        WITH updated_device AS (
          UPDATE devices
          SET
            status = 'online',
            last_seen = CURRENT_TIMESTAMP
          WHERE device_code = $1::varchar(50)
          RETURNING device_id
        )

        INSERT INTO sensor_readings (
          device_id,
          temperature,
          humidity,
          smoke_value,
          flame_detected
        )

        SELECT
          device_id,
          $2::numeric(6,2),
          $3::numeric(6,2),
          $4::integer,
          $5::boolean
        FROM updated_device

        RETURNING *
        `,
        [
          deviceCode,
          temperature,
          humidity,
          smoke_value,
          flame_detected
        ]
      );

      // Check if device exists.
      if (result.rowCount === 0) {
        console.error(
          `Unregistered device: ${deviceCode}`
        );

        return;
      }

      const reading = result.rows[0];

      console.log("Sensor reading saved:", {
        deviceCode,
        readingId: reading.reading_id,
        temperature,
        humidity,
        smoke_value,
        flame_detected
      });
      // Broadcast device online status
      io.emit("device:status", {
          device_id: reading.device_id,
          device_code: deviceCode,
          status: "online",
          last_seen: new Date().toISOString()
      });

      // ==========================================
      // BROADCAST SENSOR READING
      // ==========================================

      io.emit("sensor:reading", {
        device_code: deviceCode,
        ...reading
      });

      // ==========================================
      // PROCESS AUTOMATIC ALERTS
      // ==========================================

      console.log("Starting alert processing:", {
        deviceCode,
        smokeValue: data.smoke_value,
        smokeThreshold: SMOKE_ALERT_THRESHOLD,
        temperature: data.temperature,
        temperatureThreshold: TEMPERATURE_ALERT_THRESHOLD,
        flameDetected: data.flame_detected
      });

      await processAlerts(
        io,
        reading.device_id,
        deviceCode,
        data
      );

      console.log("Alert processing completed:", deviceCode);

    } catch (error) {
      console.error(
        "MQTT message processing failed:"
      );

      console.error(error);
    }
  });

  return client;
}

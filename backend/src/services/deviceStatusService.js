
import { pool } from "../config/database.js";

// Check device status every 10 seconds.
const CHECK_INTERVAL_MS = 10_000;

const OFFLINE_TIMEOUT_SECONDS = Number(
  process.env.DEVICE_OFFLINE_TIMEOUT_SECONDS || 90
);

async function checkDeviceStatuses(io) {
  try {
    const result = await pool.query(
      `
      UPDATE devices
      SET status = 'offline'
      WHERE status = 'online'
        AND last_seen IS NOT NULL
        AND last_seen < NOW() - (
          $1 * INTERVAL '1 second'
        )
      RETURNING
        device_id,
        device_code,
        device_name,
        status,
        last_seen
      `,
      [OFFLINE_TIMEOUT_SECONDS]
    );

    for (const device of result.rows) {
      console.log(
        `Device marked offline: ${device.device_code}`
      );

      io.emit("device:status", device);
    }
  } catch (error) {
    console.error(
      "Device status monitoring failed:",
      error.message
    );
  }
}

export function initializeDeviceStatusMonitor(io) {
  console.log(
    `Device status monitor started. Timeout: ${OFFLINE_TIMEOUT_SECONDS} seconds.`
  );

  // Run an initial check.
  checkDeviceStatuses(io);

  // Continue checking every 10 seconds.
  setInterval(() => {
    checkDeviceStatuses(io);
  }, CHECK_INTERVAL_MS);
}

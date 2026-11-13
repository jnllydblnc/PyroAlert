
import { Router } from "express";
import { pool } from "../config/database.js";

const router = Router();

// GET all active alerts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.alert_id,
        a.device_id,
        d.device_name,
        d.device_code,
        a.alert_type,
        a.severity,
        a.message,
        a.status,
        a.created_at,
        a.resolved_at
      FROM alerts a
      LEFT JOIN devices d
        ON a.device_id = d.device_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });

  } catch (error) {
    console.error("Error fetching alerts:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve alerts"
    });
  }
});

export default router;

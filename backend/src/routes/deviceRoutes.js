import { Router } from "express";
import { pool } from "../config/database.js";

const router = Router();

// GET all registered devices
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        device_id,
        device_name,
        device_code,
        location,
        status,
        last_seen,
        created_at
      FROM devices
      ORDER BY device_id ASC
    `);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });

  } catch (error) {
    console.error("Error fetching devices:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve devices"
    });
  }
});

// GET device by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID"
      });
    }

    const result = await pool.query(
      "SELECT * FROM devices WHERE device_id = $1",
      [Number(id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Error fetching device:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve device"
    });
  }
});

export default router;
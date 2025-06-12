require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// — Connect to MongoDB
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => console.log("✅ Connected to MongoDB"))
	.catch((err) => {
		console.error("❌ Mongo error:", err);
		process.exit(1);
	});

// — Define a Log schema
const logSchema = new mongoose.Schema({
	level: { type: String, required: true }, // e.g. 'info', 'warn', 'error'
	value: { type: mongoose.Schema.Types.Mixed, required: true }, // either String or full Object
	timestamp: { type: Date, default: () => new Date() }, // auto‐stamp when logged
});
const Log = mongoose.model("Log", logSchema);

// — Start Express
const app = express();
const corsOptions = {
	// Allow any origin
	origin: "*",

	// List HTTP methods you want to allow
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

	// List headers clients are allowed to send
	allowedHeaders: ["Content-Type", "Authorization"],

	// If you need cookies or HTTP auth, set this to true
	// and replace origin: '*' with a function/callback
	credentials: false,
};

app.use(cors(corsOptions));
// Make sure to also handle pre-flight
app.options("*", cors(corsOptions));
app.use(express.json());

// — POST /logs  →  save a log entry
app.post("/logs", async (req, res) => {
	const { level, value } = req.body;
	if (!level || value === undefined) {
		return res
			.status(400)
			.json({ error: "Both level and value are required." });
	}
	try {
		const entry = new Log({ level, value });
		await entry.save();
		res.status(201).json({ message: "Log saved." });
	} catch (err) {
		console.error("Save error:", err);
		res.status(500).json({ error: "Failed to save log." });
	}
});

// — Health‐check or root with full server info
app.get('/', async (_req, res) => {
    // Calculate basic stats
    const uptimeSeconds = process.uptime();
    const memoryUsage = process.memoryUsage();       // { rss, heapTotal, heapUsed, external, … }
    const dbState = mongoose.connection.readyState;  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptimeSeconds)}s`,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      },
     
      versions: {
        node: process.versions.node,
        mongoose: mongoose.version,
      },
      dbConnection: {
        code: dbState,
        // map numeric state to human-readable
        status:
          dbState === 0 ? 'disconnected' :
          dbState === 1 ? 'connected' :
          dbState === 2 ? 'connecting' :
          dbState === 3 ? 'disconnecting' :
          'unknown',
      },
    });
  });
  

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Listening on http://localhost:${port}`));

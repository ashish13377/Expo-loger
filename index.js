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

const logSchema = new mongoose.Schema({
	level: { type: String, required: true },
	value: { type: mongoose.Schema.Types.Mixed, required: true },
	timestamp: { type: Date, default: () => new Date() },
});
const Log = mongoose.model("Log", logSchema);

const app = express();
const corsOptions = {
	origin: "*",
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: false,
};

app.use(cors(corsOptions));
app.use(express.json());

// ← either remove this entirely,
// or switch to the regex version below:
app.options(/.*/, cors(corsOptions));

app.post("/logs", async (req, res) => {
	const { level, value } = req.body;
	if (!level || value === undefined) {
		return res
			.status(400)
			.json({ error: "Both level and value are required." });
	}
	try {
		await new Log({ level, value }).save();
		res.status(201).json({ message: "Log saved." });
	} catch (err) {
		console.error("Save error:", err);
		res.status(500).json({ error: "Failed to save log." });
	}
});

app.get("/logs/:date", async (req, res) => {
	const { date } = req.params;
	const startOfDay = new Date(`${date}T00:00:00.000Z`);
	const endOfDay = new Date(`${date}T23:59:59.999Z`);

	const logs = await Log.find({ timestamp: { $gte: startOfDay, $lt: endOfDay } })
		.sort({ timestamp: 1 })
		.select("-_id -__v")
		.lean();

	return res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		data: logs,
	});
});

app.get("/", async (_req, res) => {
	const uptimeSeconds = process.uptime();
	const mem = process.memoryUsage();
	const dbState = mongoose.connection.readyState;

	res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: `${Math.floor(uptimeSeconds)}s`,
		memory: {
			rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
			heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
		},
		
		versions: {
			node: process.versions.node,
			mongoose: mongoose.version,
		},
		dbConnection: {
			code: dbState,
			status:
				["disconnected", "connected", "connecting", "disconnecting"][dbState] ||
				"unknown",
		},
	});
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Listening on http://localhost:${port}`));

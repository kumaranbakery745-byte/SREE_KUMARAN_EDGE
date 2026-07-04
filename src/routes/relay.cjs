const { MongoClient } = require("mongodb");
const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://tharunselvazoom_db_user:Tharunmongodb23@cluster0.4ogfznc.mongodb.net/?appName=Cluster0";
const DB_NAME = "EDGE_DATABASE";
const COLLECTION_NAME = "PRINT_JOBS";

const client = new MongoClient(MONGODB_URI);
const processing = new Set();

function printReceipt(html) {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(os.tmpdir(), `kumaran-receipt-${Date.now()}.html`);
    fs.writeFileSync(tempPath, html, "utf8");

    const escapedPath = tempPath.replace(/'/g, "''");
    const command = `powershell -NoProfile -Command "Start-Process -FilePath '${escapedPath}' -Verb Print"`;

    console.log(`Executing print command for: ${tempPath}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Print command error:", error);
        console.error("stderr:", stderr);
        reject(error);
        return;
      }
      
      console.log("Print command executed successfully");
      
      setTimeout(() => {
        try {
          fs.unlinkSync(tempPath);
          console.log(`Temp file cleaned up: ${tempPath}`);
        } catch (cleanupError) {
          console.warn("Temp file cleanup failed (non-critical):", cleanupError.message);
        }
      }, 30_000);

      resolve();
    });
  });
}

async function handleJob(job) {
  const jobId = job._id?.toString();
  if (!jobId || processing.has(jobId)) return;

  if (!job?.receipt_html || job.status !== "pending") {
    console.log(`Skipping job ${jobId}: missing receipt_html or not pending status`);
    return;
  }

  processing.add(jobId);
  console.log(`[${new Date().toISOString()}] New print job detected (${jobId}) from outlet: ${job.outlet_name}`);

  try {
    await printReceipt(job.receipt_html);
    
    // Delete the job from MongoDB after successful print
    await client.db(DB_NAME).collection(COLLECTION_NAME).deleteOne({ _id: job._id });
    console.log(`[${new Date().toISOString()}] Job ${jobId} printed successfully and removed from queue`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Printer error for job ${jobId}:`, error.message);
    
    try {
      await client.db(DB_NAME).collection(COLLECTION_NAME).updateOne(
        { _id: job._id },
        { $set: { status: "failed", error: error.message } }
      );
      console.log(`[${new Date().toISOString()}] Job ${jobId} marked as failed in MongoDB`);
    } catch (updateError) {
      console.error(`[${new Date().toISOString()}] Failed to update job status:`, updateError.message);
    }
  } finally {
    processing.delete(jobId);
  }
}

async function startRelay() {
  try {
    await client.connect();
    console.log(`[${new Date().toISOString()}] Connected to MongoDB`);
    console.log(`[${new Date().toISOString()}] Watching collection: ${DB_NAME}.${COLLECTION_NAME}`);
    console.log("Waiting for print jobs...");

    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    const changeStream = collection.watch([
      { $match: { 
        "fullDocument.status": "pending",
        operationType: { $in: ["insert", "update"] }
      }}
    ]);

    changeStream.on("change", async (change) => {
      if (change.fullDocument) {
        void handleJob(change.fullDocument);
      }
    });

    changeStream.on("error", (error) => {
      console.error("MongoDB change stream error:", error);
    });

  } catch (error) {
    console.error("Failed to start relay:", error);
    process.exit(1);
  }
}

console.log(`[${new Date().toISOString()}] Printer relay starting...`);
startRelay();

process.on("SIGINT", async () => {
  console.log("\nShutting down printer relay...");
  await client.close();
  process.exit(0);
});

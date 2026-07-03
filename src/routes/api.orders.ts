import { createFileRoute } from "@tanstack/react-router";
import { MongoClient, ServerApiVersion } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://tharunselvazoom_db_user:Tharunmongodb23@cluster0.4ogfznc.mongodb.net/?appName=Cluster0";
const DB_NAME = process.env.DB_NAME || "EDGE_DATABASE";
const COLLECTION_NAME = "WOW";

let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export const Route = createFileRoute("/api/orders")({
  async POST({ request }) {
    try {
      const order = await request.json();
      const orderWithDefaults = {
        ...order,
        status: "pending",
        createdAt: new Date(),
      };

      const { db } = await connectToDatabase();
      const result = await db.collection(COLLECTION_NAME).insertOne(orderWithDefaults);

      return new Response(
        JSON.stringify({ success: true, insertedId: result.insertedId }),
        {
        status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("MongoDB insertion error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to insert order" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});

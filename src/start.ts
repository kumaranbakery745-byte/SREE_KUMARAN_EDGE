import { createStart, createMiddleware } from "@tanstack/react-start";
import { MongoClient, ServerApiVersion } from "mongodb";

import { renderErrorPage } from "./lib/error-page";

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

const apiMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (request.method === "POST" && new URL(request.url).pathname === "/api/orders") {
    try {
      console.log("API: Received order request");
      const order = await request.json();
      console.log("API: Order data:", order);
      const orderWithDefaults = {
        ...order,
        status: "pending",
        createdAt: new Date(),
      };

      const { db } = await connectToDatabase();
      console.log("API: Connected to MongoDB, inserting...");
      const result = await db.collection(COLLECTION_NAME).insertOne(orderWithDefaults);
      console.log("API: Inserted successfully, id:", result.insertedId);

      return new Response(
        JSON.stringify({ success: true, insertedId: result.insertedId }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("MongoDB insertion error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to insert order",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return await next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [apiMiddleware, errorMiddleware],
}));

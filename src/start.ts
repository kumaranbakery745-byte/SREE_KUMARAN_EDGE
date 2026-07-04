import { createStart, createMiddleware } from "@tanstack/react-start";
import { MongoClient, ServerApiVersion } from "mongodb";

import { renderErrorPage } from "./lib/error-page";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://tharunselvazoom_db_user:Tharunmongodb23@cluster0.4ogfznc.mongodb.net/?appName=Cluster0";
const DB_NAME = process.env.DB_NAME || "EDGE_DATABASE";
const ORDERS_COLLECTION = "WOW";
const COUNTERS_COLLECTION = "COUNTERS";
const PRODUCTS_COLLECTION = "PRODUCTS";

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

async function getNextBillNumber(db: any, branch: string) {
  const result = await db.collection(COUNTERS_COLLECTION).findOneAndUpdate(
    { branch },
    { 
      $inc: { count: 1 },
      $setOnInsert: { count: 1 }
    },
    { upsert: true, returnDocument: "after" }
  );
  
  // Modern MongoDB Node.js driver returns result.value
  if (result && result.value && result.value.count) {
    return result.value.count;
  }
  
  // Fallback for older driver versions
  const doc = await db.collection(COUNTERS_COLLECTION).findOne({ branch });
  if (doc && doc.count) {
    return doc.count;
  }
  
  return 1;
}

const apiMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (request.method === "POST" && new URL(request.url).pathname === "/api/orders") {
    try {
      console.log("API: Received order request");
      const order = await request.json();
      console.log("API: Order data:", order);

      const { db } = await connectToDatabase();
      console.log("API: Connected to MongoDB");

      // Get sequential bill number from COUNTERS
      const billNo = await getNextBillNumber(db, order.branch);
      console.log("API: Got bill number", billNo);

      // Look up product names from PRODUCTS collection
      const productIds = order.items.map((i: any) => i.productId);
      const products = await db.collection(PRODUCTS_COLLECTION).find({ id: { $in: productIds } }).toArray();
      const productMap = new Map();
      products.forEach((p: any) => productMap.set(p.id, p));
      
      // Process items
      const itemsWithProductNames = order.items.map((i: any) => {
        const product = productMap.get(i.productId);
        return {
          ...i,
          productName: i.isCustomCake ? i.name : (product?.name || i.name)
        };
      });

      const orderWithDefaults = {
        ...order,
        items: itemsWithProductNames,
        billNo,
        status: "pending",
        createdAt: new Date(),
      };

      console.log("API: Inserting order...");
      const result = await db.collection(ORDERS_COLLECTION).insertOne(orderWithDefaults);
      console.log("API: Inserted successfully, id:", result.insertedId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          insertedId: result.insertedId,
          billNo 
        }),
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

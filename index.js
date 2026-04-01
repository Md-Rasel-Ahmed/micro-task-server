const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// mongodb

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.6plls.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // collection here
    const tasks = client.db("micro_task").collection("tasks");
    const users = client.db("micro_task").collection("users");
    const submitedTaskCollection = client
      .db("micro_task")
      .collection("submitedTask");
    app.get("/tasks", async (req, res) => {
      const result = await tasks.find().toArray();
      res.send(result);
    });
    app.get("/buyerTask/:email", async (req, res) => {
      res.set("Cache-Control", "no-store");
      const email = req.params.email;
      const filter = { email: email };

      const result = await tasks.find(filter).toArray();
      console.log("buyer task", result);
      res.send(result);
    });
    app.post("/tasks", async (req, res) => {
      const data = req.body;
      const totalCostCoins = data.required_workers * data.payable_amount;
      const converTotalCost = parseInt(totalCostCoins);
      const updateFilter = { email: data.email };

      const result = await tasks.insertOne(data);

      // update user info
      const findUser = await users.findOne(updateFilter);
      const updateDocument = {
        $set: {
          "stats.tasks_posted": findUser.stats.tasks_posted + 1,
          "stats.total_spent": findUser.stats.total_spent + converTotalCost,
          coins: findUser.coins - converTotalCost,
        },
      };
      const updateUserInfo = await users.updateOne(
        updateFilter,
        updateDocument,
      );
      res.send({ result, updateUserInfo });
    });
    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await tasks.deleteOne(filter);
      res.send(result);
    });
    app.get("/taskReview/:email", async (req, res) => {
      const filter = { buyer_email: req.params.email };
      const result = await submitedTaskCollection.find(filter).toArray();
      res.send(result);
    });
    // worker
    app.post("/submitedTask", async (req, res) => {
      const data = req.body;
      const buyerTaskFilter = { _id: new ObjectId(req.body.task_id) };
      const result = await submitedTaskCollection.insertOne(data);
      const findBuyerTask = await tasks.findOne(buyerTaskFilter);
      const updateDoc = {
        $set: {
          required_workers: findBuyerTask.required_workers - 1,
        },
      };
      const updateBuyerTask = await tasks.updateOne(buyerTaskFilter, updateDoc);
      res.send({ result, updateBuyerTask });
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await users.findOne(filter);
      console.log(result);
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const data = req.body;
      const result = await users.insertOne(data);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(` app is listening on port ${port}`);
});

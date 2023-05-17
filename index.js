const express = require("express");
const cors = require("cors");
require("dotenv").config();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  ConnectionCheckOutFailedEvent,
} = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dciaudj.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
});

/* ----------- token verify------------ */
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized Access" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect((err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    /* ----- mongodb collection------- */
    const productCollection = client.db("emaJhonData").collection("products");
    const ordersCollection = client.db("emaJhonData").collection("orders");

    /* ------------- load number of total products ------------- */
    app.get("/totalProducts", async (req, res) => {
      const totalProducts = await productCollection.countDocuments();
      console.log("It is Local Server", req.url);
      res.send({ totalProducts: totalProducts });
    });

    /* ------------------ load product using pagination ----------------- */
    app.get("/products", async (req, res) => {
      const currentPage = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 12;
      const skip = currentPage * limit;
      const result = await productCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();

      console.log("It is Local Server", req.url);
      res.send(result);
    });

    /* ------------- add to cart ----------------- */
    app.post("/add-to-cart/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const findQuery = { productId: id, email: data.email };
      const alreadyAdded = await ordersCollection.findOne(findQuery);
      if (alreadyAdded) {
        const updateQuantity = {
          $set: {
            quantity: alreadyAdded.quantity + 1,
          },
        };
        const result = await ordersCollection.updateOne(
          findQuery,
          updateQuantity
        );
        res.send(result);
      } else {
        const result = await ordersCollection.insertOne(data);
        console.log("It is Local Server", req.url);
        res.send(result);
      }
    });

    /* ----------------- remove from cart --------------- */
    app.delete("/remove-from-cart/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);
      console.log("It is Local Server", req.url);
      res.send(result);
    });

    /* ----------------- clear cart -------------------- */
    app.delete("/clear-cart", verifyToken, async (req, res) => {
      const email = req.query.email;
      const decoded = req.decoded;
      if (decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "Access Forbidden" });
      }
      const filter = { email: email };
      const result = await ordersCollection.deleteMany(filter);
      console.log("It is Local Server", req.url);
      res.send(result);
    });

    /* ---------------- get orders data ------------ */
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      const decoded = req.decoded;
      if (email !== decoded.email) {
        return res
          .status(403)
          .send({ error: true, message: "Access forbidden" });
      }
      const query = { email: email };
      const orders = await ordersCollection.find(query).toArray();
      console.log("It is Local Server", req.url);
      res.send(orders);
    });

    /* ----------------- generate jwt token for user ----------------- */
    app.post("/generateUserToken", (req, res) => {
      const data = req.body;
      const token = jwt.sign(data, process.env.JWT_SECRET_TOKEN, {
        algorithm: "HS512",
        expiresIn: "1h",
      });
      res.send({ token: token });
      console.log("It is Local Server", req.url);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Ema-Jhon Server Is Running");
});

app.listen(port, () => {
  console.log(`Ema-Jhon Server Running On ${port}`);
});

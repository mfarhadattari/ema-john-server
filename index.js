const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    app.get("/products", async (req, res) => {
      const currentPage = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 12;
      const skip = currentPage * limit;
      const result = await productCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send(result);
    });

    app.get("/totalProducts", async (req, res) => {
      const totalProducts = await productCollection.countDocuments();
      res.send({ totalProducts: totalProducts });
    });

    app.post("/generateUserToken", (req, res) => {
      const data = req.body;
      console.log(data);

      const token = jwt.sign(data, process.env.JWT_SECRET_TOKEN, {
        algorithm: "HS512",
        expiresIn: "60",
      });

      console.log(token);

      res.send({ token: token });
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

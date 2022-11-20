const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.gvjclco.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorization access !!" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.USER_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(402).send({
        success: false,
        message: "Forbidden access",
      });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const appointmentOptionCollection = client
      .db("doctor-portal")
      .collection("appointmentTime");

    const bookingCollections = client
      .db("doctor-portal")
      .collection("bokkings");
    const usersCollections = client.db("doctor-portal").collection("users");

    //--.............jwt.......................--

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };

      const user = await usersCollections.findOne(filter);
      if (user) {
        const token = jwt.sign({ email }, process.env.USER_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ token });
      }
      res.status(401).send({ token: "" });
    });

    //   -----------appointmentOption------------------

    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const options = await appointmentOptionCollection.find({}).toArray();
      const bookingQurey = { date: date };
      const allreadyBook = await bookingCollections
        .find(bookingQurey)
        .toArray();
      //   console.log(allreadyBook);
      options.forEach((option) => {
        const optionBooked = allreadyBook.filter(
          (booked) => booked.ServiceName == option.name
        );
        const bookSlots = optionBooked.map((book) => book.time);
        const remaining = option.slots.filter(
          (slot) => !bookSlots.includes(slot)
        );
        option.slots = remaining;
      });

      res.send(options);
    });

    // -------------------booking--------------------

    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        res.status(403).send({
          message: "Email doesn't exist !!",
        });
      }
      const filter = {
        email: email,
      };
      const result = await bookingCollections.find(filter).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const filter = {
        ServiceName: booking.ServiceName,
        date: booking.date,
        email: booking.email,
      };

      const allreadyBook = await bookingCollections.find(filter).toArray();
      if (allreadyBook.length) {
        const message = "You all ready book this service !!";
        return res.send({ acknowledged: false, message });
      }

      const result = await bookingCollections.insertOne(booking);
      res.send(result);
    });

    // --------------------users---------------------------

    app.get("/users", async (req, res) => {
      const filter = {};
      const result = await usersCollections.find(filter).toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await usersCollections.findOne(filter);
      res.send({ isAdmin: user?.role === "Admin" });
    });

    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = {
        email: decodedEmail,
      };

      const user = await usersCollections.findOne(query).toArray();
      if (user?.role !== "Admin") {
        return res
          .status(403)
          .send({ message: "You are not a admin ,so  cannot make admin !!" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "Admin",
        },
      };
      const result = await usersCollections.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollections.insertOne(user);
      res.send(result);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Server is running ");
});

app.listen(port, () => {
  console.log("Server is running 5000 port!");
});

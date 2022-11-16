const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
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

async function run() {
  try {
    const appointmentOptionCollection = client
      .db("doctor-portal")
      .collection("appointmentTime");

    const bookingCollections = client
      .db("doctor-portal")
      .collection("bokkings");

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

    app.post("/bookings", async (req, res) => {
      const user = req.body;
      console.log(user);

      //   const filter = {
      //     ServiceName: req.body.ServiceName,
      //     // email: req.body.email,
      //     // date: req.body.date,
      //   };
      //   console.log(filter);

      //   const allreadyBook = await bookingCollections.find(filter).toArray();
      //   //   console.log(allreadyBook);

      //   if (allreadyBook.length) {
      //     const message = "You all ready book this service !!";
      //     return res.send({ message, acknowledged: false });
      //   }

      const booking = await bookingCollections.insertOne(req.body);
      res.send(booking);
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

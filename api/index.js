const express = require("express");
const axios = require("axios");
const fs = require("fs");
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");
const serverless = require("serverless-http");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
const port = process.env.PORT || 3000;
const MTA_API_KEY = process.env.MTA_API_KEY;

const endpoints = [
  "nyct%2Fgtfs-bdfm",
  "nyct%2Fgtfs-ace",
  "nyct%2Fgtfs-g",
  "nyct%2Fgtfs-nqrw",
  "nyct%2Fgtfs-l",
  "nyct%2Fgtfs-jz",
  "nyct%2Fgtfs",
];

const stationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "stations.json"), "utf8")
);

const stopsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "stops.json"), "utf8")
);

app.get("/api/stations", (req, res) => {
  try {
    let stationsNames = [];
    const stationsData = JSON.parse(fs.readFileSync("stations.json", "utf8"));
    for (const key in stationsData) {
      stationsNames.push(stationsData[key].name);
    }
    res.json(stationsNames);
  } catch (error) {
    console.error("Error reading stations.json:", error);
    res.status(500).json({ error: "Failed to load station list" });
  }
});

app.post("/station-updates/", async (req, res) => {
  const stations = req.body.stations; // array of proper station names
  console.log("Received stations:", stations);

  try {
    const responses = await Promise.all(
      endpoints.map((endpoint) =>
        axios.get(
          `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/${endpoint}`,
          {
            responseType: "arraybuffer",
            headers: {
              "x-api-key": MTA_API_KEY,
              "Accept-Encoding": "gzip",
            },
          }
        )
      )
    );

    const feeds = responses.map((response) =>
      GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(response.data)
    );

    const updates = [];
    const stationUpdateCount = new Map(); // To limit 2 per station

    feeds.forEach((feed) => {
      feed.entity.forEach((entity) => {
        const routeId = entity.tripUpdate?.trip?.routeId;

        if (!entity.tripUpdate?.stopTimeUpdate) return;

        entity.tripUpdate.stopTimeUpdate.forEach((stopTimeUpdate) => {
          const strippedStopId = stopTimeUpdate.stopId.replace(/[NS]$/, "");

          // Find the station object where stops include this stopId
          const matchingStations = Object.values(stationsData).filter(
            (station) =>
              Object.keys(station.stops).includes(strippedStopId) &&
              stations.includes(station.name)
          );

          matchingStations.forEach((station) => {
            const key = routeId + station.name + stopTimeUpdate.stopId;
            console.log(key);
            const currentCount = stationUpdateCount.get(key) || 0;
            if (currentCount >= 2) return;
            stationUpdateCount.set(key, currentCount + 1);

            let parentStation = Object.entries(stopsData).find(([key]) =>
              key.includes(entity.tripUpdate.trip.tripId)
            )?.[1];
            if (parentStation == null) {
              parentStation =
                stopsData[
                  routeId +
                    stopTimeUpdate.stopId[stopTimeUpdate.stopId.length - 1]
                ];
            }
            console.log(
              routeId + stopTimeUpdate.stopId[stopTimeUpdate.stopId.length - 1]
            );
            updates.push({
              routeId,
              stopName: station.name,
              parentStation: parentStation,
              fullStopId: stopTimeUpdate.stopId,
              stopId: strippedStopId,
              arrivalTime: new Date(
                stopTimeUpdate.arrival?.time?.low * 1000
              ).toLocaleString(),
            });
          });
        });
      });
    });

    console.log("Updates:", updates);
    const base64 = Buffer.from(JSON.stringify(updates)).toString("base64");
    res.send(base64);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = serverless(app);

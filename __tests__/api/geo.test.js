const request = require("supertest");
const app = require("../../app");
const jwt = require("jsonwebtoken");
const { connectMongoDB, mongoose } = require("../../config/mongodb.js");

describe("API Geo Test", () => {
  let server;
  let token;
  beforeAll(async () => {
    server = app.listen(3000);
    await connectMongoDB();
    let payload = { subject: 1 };
    token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_DURING,
    });
  });

  it("GET /api/geo", async () => {
    const { statusCode, body } = await request(app)
      .get("/api/geo")
      .set("Authorization", `Bearer ${token}`)
      .send();

    const { user_id, lines, polygons, points } = body.geoJson;
    expect(statusCode).toBe(200);
    expect(user_id).toBe(1);
    expect(lines.length).toBeGreaterThan(0);
    expect(polygons.length).toBeGreaterThan(0);
    expect(points.length).toBeGreaterThan(0);
  }, 10000);

  it("POST /api/geo/point", async () => {
    const payload = {
      type: "Feature",
      properties: { id: 17052572410411, desc: "" },
      geometry: { type: "Point", coordinates: [-5.9232, 35.797718] },
    };
    const { statusCode } = await request(app)
      .post("/api/geo/point")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("POST /api/geo/polygon", async () => {
    const payload = {
      type: "Feature",
      properties: {
        stroke: "#555555",
        "stroke-width": 2,
        "stroke-opacity": 1,
        fill: "#555555",
        "fill-opacity": 0.5,
        name: "rectangle",
        id: 17052579682881,
        desc: "",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.869626, 35.828903],
            [-5.829789, 35.803288],
            [-5.871, 35.759833],
            [-5.902595, 35.792148],
            [-5.869626, 35.828903],
          ],
        ],
      },
    };
    const { statusCode } = await request(app)
      .post("/api/geo/polygon")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("POST /api/geo/line", async () => {
    const payload = {
      type: "Feature",
      properties: {
        color: "#f357a1",
        weight: 10,
        id: 17052580994501,
        desc: "",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-5.893531, 35.820588],
          [-5.919287, 35.823372],
          [-5.936802, 35.813906],
        ],
      },
    };
    const { statusCode } = await request(app)
      .post("/api/geo/line")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo/point", async () => {
    const payload = {
      dataJson: {
        type: "Feature",
        properties: {
          id: 17052572410411,
          desc: "test update Content Popup",
          name: "test update Content Popup",
        },
        geometry: { type: "Point", coordinates: [-5.916822, 35.796652] },
      },
      userId: 1,
    };
    const { statusCode } = await request(app)
      .put("/api/geo/point")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo/polygon", async () => {
    const payload = {
      dataJson: {
        type: "Feature",
        properties: {
          stroke: "#555555",
          "stroke-width": 2,
          "stroke-opacity": 1,
          fill: "#555555",
          "fill-opacity": 0.5,
          name: "rectangle",
          id: 17052579682881,
          desc: "",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-5.897602, 35.81141],
              [-5.869626, 35.828903],
              [-5.829789, 35.803288],
              [-5.871, 35.759833],
              [-5.902595, 35.792148],
              [-5.897602, 35.81141],
            ],
          ],
        },
      },
      userId: 1,
    };
    const { statusCode } = await request(app)
      .put("/api/geo/polygon")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo/line", async () => {
    const payload = {
      dataJson: {
        type: "Feature",
        properties: {
          color: "#f357a1",
          weight: 10,
          id: 17052580994501,
          desc: "",
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [-5.893531, 35.820588],
            [-5.919571, 35.830062],
            [-5.936802, 35.813906],
          ],
        },
      },
      userId: 1,
    };
    const { statusCode } = await request(app)
      .put("/api/geo/line")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo/popup", async () => {
    const payload = {
      id: 17052572410411,
      type: "point",
      contentText: "test update Content Popup",
    };
    const { statusCode } = await request(app)
      .put("/api/geo/popup")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo (delete a point from the configuration)", async () => {
    const payload = {
      id: 17052572410411,
      userId: 1,
      type: "point",
    };
    const { statusCode } = await request(app)
      .put("/api/geo")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo (delete a polygon from the configuration)", async () => {
    const payload = {
      id: 17052579682881,
      userId: 1,
      type: "polygon",
    };
    const { statusCode } = await request(app)
      .put("/api/geo")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  it("PUT /api/geo (delete a line from the configuration)", async () => {
    const payload = {
      id: 17052580994501,
      userId: 1,
      type: "line",
    };
    const { statusCode } = await request(app)
      .put("/api/geo")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(statusCode).toBe(204);
  });

  afterAll(async () => {
    token = null;
    await mongoose.disconnect();
    await mongoose.connection.close();
    server.close();
  });
});

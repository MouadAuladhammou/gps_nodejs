const { connectMongoDB, mongoose } = require("../../config/mongodb.js");
var {
  getGeoConfiguration,
  createPoint,
  createPolygon,
  createLine,
  updateContentPopup,
  updatePoint,
  updatePolygon,
  updateLine,
  deleteGeoConfiguration,
} = require("../../controllers/geoController.js");

beforeAll(async () => {
  await connectMongoDB();
});

it("Verify retrieval of configuration for user with ID 1", async () => {
  const req = {
    userId: 1,
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  expect.assertions(6);
  await getGeoConfiguration(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  const receivedData = res.send.mock.calls[0][0].geoJson;
  expect(receivedData).toHaveProperty("_id");
  expect(receivedData).toHaveProperty("user_id");
  expect(receivedData).toHaveProperty("lines");
  expect(receivedData).toHaveProperty("polygons");
  expect(receivedData).toHaveProperty("points");
});

it("Test create point", async () => {
  const req = {
    userId: 1,
    body: {
      type: "Feature",
      properties: { id: 17052572410411, desc: "" },
      geometry: { type: "Point", coordinates: [-5.9232, 35.797718] },
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await createPoint(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test create polygon", async () => {
  const req = {
    userId: 1,
    body: {
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
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await createPolygon(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test create line", async () => {
  const req = {
    userId: 1,
    body: {
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
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await createLine(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test update content popup", async () => {
  const req = {
    userId: 1,
    body: {
      id: 17052572410411,
      type: "point",
      contentText: "test update Content Popup",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await updateContentPopup(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test update point", async () => {
  const req = {
    userId: 1,
    body: {
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
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await updatePoint(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test update polygon", async () => {
  const req = {
    userId: 1,
    body: {
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
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await updatePolygon(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test update line", async () => {
  const req = {
    userId: 1,
    body: {
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
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await updateLine(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test delete point", async () => {
  const req = {
    userId: 1,
    body: {
      id: 17052572410411,
      userId: 1,
      type: "point",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await deleteGeoConfiguration(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test delete polygon", async () => {
  const req = {
    userId: 1,
    body: {
      id: 17052579682881,
      userId: 1,
      type: "polygon",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await deleteGeoConfiguration(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

it("Test delete line", async () => {
  const req = {
    userId: 1,
    body: {
      id: 17052580994501,
      userId: 1,
      type: "line",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };

  expect.assertions(1);
  await deleteGeoConfiguration(req, res);
  expect(res.status).toHaveBeenCalledWith(204);
});

afterAll(async () => {
  await mongoose.disconnect();
});

const request = require("supertest");
const app = require("../../app");
const jwt = require("jsonwebtoken");

describe("API Rules Test", () => {
  let server;
  let token;
  let ruleId;
  beforeAll(async () => {
    server = app.listen(3000);
    let payload = { subject: 1 };
    token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_DURING,
    });
  });

  it("GET / should return a list of rules", async () => {
    const response = await request(app)
      .get("/api/rules")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty("id");
    expect(response.body[0]).toHaveProperty("name");
    expect(response.body[0]).toHaveProperty("description");
    expect(response.body[0]).toHaveProperty("type");
    expect(response.body[0]).toHaveProperty("params");
    expect(response.body[0]).toHaveProperty("value");
  });

  it("POST /", async () => {
    const payload = {
      type: "1",
      name: "test",
      description: "test desc",
      params: "exit",
      value: "17901264276011",
    };
    const response = await request(app)
      .post("/api/rules")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    ruleId = response.body.id;
  });

  it("GET /:id", async () => {
    const response = await request(app)
      .get(`/api/rules/${ruleId}`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("description");
    expect(response.body).toHaveProperty("type");
    expect(response.body).toHaveProperty("params");
    expect(response.body).toHaveProperty("value");
    expect(response.body).toHaveProperty("user_id");
  });

  it("PUT /:id", async () => {
    const payload = {
      name: "test 2",
      description: "test desc 2",
      params: "entry",
      value: "1212",
      id: ruleId,
    };

    const response = await request(app)
      .put(`/api/rules/${ruleId}`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ruleId);
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("description");
    expect(response.body).toHaveProperty("type");
    expect(response.body).toHaveProperty("params");
    expect(response.body).toHaveProperty("value");
    expect(response.body).toHaveProperty("user_id");
  });

  it("DELETE /:id", async () => {
    const response = await request(app)
      .delete(`/api/rules/${ruleId}`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(response.status).toBe(204);
  });

  afterAll(() => {
    server.close();
  });
});

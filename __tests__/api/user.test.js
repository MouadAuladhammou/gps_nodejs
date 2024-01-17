const request = require("supertest");
const app = require("../../app");

describe("API Users Test", () => {
  let server;
  beforeAll(() => {
    server = app.listen(3000);
  });

  it("GET /api/users/all should return a list of users", async () => {
    const response = await request(app)
      .get("/api/users/all")
      .query({ search: "" });

    expect(response.status).toBe(200);
    expect(response.body.totalPages).toBeGreaterThan(0);
    expect(response.body.users.length).toBeGreaterThan(0);
    expect(response.body).toHaveProperty("totalPages");
  });

  afterAll(() => {
    server.close();
  });
});

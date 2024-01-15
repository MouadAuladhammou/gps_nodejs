const request = require("supertest");
const app = require("../../app");

describe("API Users Test", () => {
  let server;
  beforeAll(() => {
    // Avant que les tests ne commencent, démarrez le serveur (ou initialisez d'autres ressources)
    server = app.listen(3000); // Remplacez 3000 par le port que votre application utilise
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

  afterAll((done) => {
    // Après que tous les tests soient terminés, arrêtez le serveur (ou nettoyez d'autres ressources)
    server.close(done);
  });
});

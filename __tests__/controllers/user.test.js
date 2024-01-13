const { connectMySQL, sequelize } = require("../../config/mysql.js");
const {
  loginUser,
  currentUser,
  updateUser,
} = require("../../controllers/userController.js");

beforeAll(async () => {
  await connectMySQL();
});

it("Verify user login", async () => {
  const req = {
    body: {
      email: "test@hotmail.com",
      password: "123456",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  expect.assertions(1);
  await loginUser(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
});

it("Check current user", async () => {
  const req = {
    userId: 1,
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  expect.assertions(1);
  await currentUser(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
});

it("Test user update", async () => {
  const req = {
    body: {
      last_name: "last_name",
      first_name: "first_name",
      email: "test@hotmail.com",
      cin: "L111111",
      address: "address test",
      city: "city test",
      postal_code: "postal_code test",
      cell_phone: "cell_phone test",
      work_phone: "work_phone test",
      password: "123456",
    },
    params: {
      id: 1,
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

  expect.assertions(2);
  await updateUser(req, res);
  expect(res.status).toHaveBeenCalledWith(200);

  const expectedUpdatedUser = {
    id: 1,
    last_name: "last_name",
    first_name: "first_name",
    email: "test@hotmail.com",
    cin: "L111111",
    address: "address test",
    city: "city test",
    postal_code: "postal_code test",
    cell_phone: "cell_phone test",
    work_phone: "work_phone test",
    password: "123456",
  };

  // expect(res.send).toHaveBeenCalledWith(expectedUpdatedUser); // NB: Il retourne un objet complet incluant des attributs de Sequelize.
  expect(res.send).toHaveBeenCalledWith(
    expect.objectContaining(expectedUpdatedUser)
  );
});

afterAll(async () => {
  await sequelize.close();
});

const { User, Group, Vehicle, Setting } = require("../models/index.js");
const jwt = require("jsonwebtoken");

const getUserById = async (id) => {
  return await User.findByPk(id);
};

const create = async (user) => {
  return await User.create({
    last_name: user.last_name,
    first_name: user.first_name,
    email: user.email,
    cin: user.cin,
    address: user.address,
    city: user.city,
    postal_code: user.postal_code,
    cell_phone: user.cell_phone,
    work_phone: user.work_phone,
    password: user.password,
    status: user.status,
  });
};

const update = async (id, user) => {
  return await User.update(
    {
      last_name: user.last_name,
      first_name: user.first_name,
      email: user.email,
      cin: user.cin,
      address: user.address,
      city: user.city,
      postal_code: user.postal_code,
      cell_phone: user.cell_phone,
      work_phone: user.work_phone,
      password: user.password,
      status: user.status,
    },
    {
      where: { id },
    }
  );
};

const remove = async (id) => {
  try {
    return await User.destroy({
      where: { id },
    });
  } catch (err) {
    throw new Error("Failed to remove user with ID " + id + err.message);
  }
};

const login = async (email, password) => {
  try {
    const user = await User.findOne({
      where: { email: email, password: password },
      include: [
        {
          model: Group,
          as: "groupes",
          include: [
            {
              model: Vehicle,
              as: "vehicles",
            },
            {
              model: Setting,
              as: "setting",
              attributes: ["id", "name", "description"],
            },
          ],
        },
      ],
    });
    return user;
  } catch (err) {
    throw new Error("Failed to log in" + err.message);
  }
};

const generateAuthToken = (user) => {
  const payload = { subject: user.id };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_DURING,
  });
};

const getCurrentUser = async (id) => {
  try {
    const user = await User.findOne({
      where: { id },
      include: [
        {
          model: Group,
          as: "groupes",
          include: [
            {
              model: Vehicle,
              as: "vehicles",
            },
            {
              model: Setting,
              as: "setting",
              attributes: ["id", "name", "description"],
            },
          ],
        },
      ],
    });
    return user;
  } catch (err) {
    throw new Error("Error while fetching current user: " + err.message);
  }
};

module.exports = {
  getUserById,
  create,
  update,
  remove,
  login,
  generateAuthToken,
  getCurrentUser,
};

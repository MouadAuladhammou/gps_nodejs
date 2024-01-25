const { Setting, Group, Vehicle } = require("../models/index.js");

class GroupService {
  async getGroupById(groupId, userId) {
    try {
      const group = await Group.findOne({
        where: { id: groupId, user_id: userId },
        include: [
          {
            model: Vehicle,
            as: "vehicles",
            attributes: [
              "id",
              "groupe_id",
              "imei",
              "make",
              "model",
              "year",
              "mileage",
              "type",
              "registration_number",
            ],
          },
          {
            model: Setting,
            as: "setting",
            attributes: ["id", "name", "description"],
          },
        ],
      });
      return group;
    } catch (error) {
      throw new Error("Error while fetching group: " + error.message);
    }
  }

  async update(groupId, userId, name, description, newSetting) {
    try {
      if (newSetting) {
        const setting = await Setting.findOne({
          where: {
            id: newSetting.id,
            user_id: userId,
          },
        });

        if (!setting) {
          throw new Error("Le paramètre spécifié n'existe pas");
        }
      }

      await Group.update(
        {
          name,
          description,
          setting_id: newSetting ? newSetting.id : null, // Assigne l'ID de la paramètre si elle est spécifiée, sinon null
        },
        {
          where: { id: groupId, user_id: userId },
        }
      );

      return await this.getGroupById(groupId, userId);
    } catch (error) {
      throw new Error(
        "Échec de la modification de l'enregistrement: " + error.message
      );
    }
  }

  async createGroupByAdmin(groupData) {
    try {
      const group = await Group.create({
        user_id: groupData.user_id,
        name: groupData.name,
        description: groupData.description,
      });
      return group;
    } catch (error) {
      throw new Error(
        "Une erreur s'est produite lors de la création du groupe: " +
          error.message
      );
    }
  }

  async createGroupByUser(userId, groupData) {
    try {
      const { name, description, setting: newSetting } = groupData;
      if (newSetting) {
        const setting = await Setting.findOne({
          where: {
            id: newSetting.id,
            user_id: userId,
          },
        });

        if (!setting) {
          throw new Error("Le paramètre spécifié n'existe pas");
        }
      }

      const group = await Group.create({
        user_id: userId,
        name,
        description,
        setting_id: newSetting ? newSetting.id : null,
      });

      return await this.getGroupById(group.id, userId);
    } catch (error) {
      throw new Error(
        "Une erreur s'est produite lors de la création du groupe: " +
          error.message
      );
    }
  }

  async deleteGroupByAdmin(groupId) {
    try {
      const rowDeleted = await Group.destroy({
        where: { id: groupId },
      });
      if (!rowDeleted) {
        throw new Error("Group not found!");
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteGroupByUser(groupId, userId) {
    try {
      const rowDeleted = await Group.destroy({
        where: { id: groupId, user_id: userId },
      });
      if (!rowDeleted) {
        throw new Error("Group not found!");
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new GroupService();

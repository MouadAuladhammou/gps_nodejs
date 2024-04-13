const { CronJob } = require("cron");
const pointInPolygon = require("point-in-polygon");
const { connectMongoDB } = require("../config/mongodb.js");
const { createLocationModel } = require("../models/location.js");
const { Task, TaskHistory } = require("../models/index.js");
const { sequelize } = require("../config/mysql.js");
const { Op } = require("sequelize");
const moment = require("moment");

const { publishDataToEmailQueues } = require("../utils/functions");

connectMongoDB();

(async () => {
  const checkTasks = async () => {
    try {
      const startOfPreviousDay = moment()
        .subtract(1, "days")
        .startOf("day")
        .toDate();
      const endOfDay = moment().endOf("day").toDate();

      // Récupérer les tâches d'hier à la date d'aujourd'hui (Mysql)
      const tasks = await Task.findAll({
        include: ["vehicle", "user"],
        where: {
          [Op.or]: [
            {
              [Op.and]: [
                { date_time_start_From: { [Op.gte]: startOfPreviousDay } },
                { date_time_start_to: { [Op.lte]: endOfDay } },
              ],
            },
            {
              [Op.and]: [
                { date_time_end_From: { [Op.gte]: startOfPreviousDay } },
                { date_time_end_to: { [Op.lte]: endOfDay } },
              ],
            },
          ],
        },
      });

      // Regrouper les tâches par "user_id"
      const groupedTasks = tasks.reduce((acc, task) => {
        const userId = task.user_id.toString();
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(task);
        return acc;
      }, {});

      for (const [userId, userTasks] of Object.entries(groupedTasks)) {
        // console.log(`🚀 User ID: ${userId}`);
        // console.log("🚀 userTasks.length", userTasks.length);

        // Créer un Array pour stocker les IMEIs uniques de l'utilisateur concerné
        const imeiSet = new Set();
        for (const task of userTasks) {
          imeiSet.add(task.vehicle.imei);
        }

        const uniqueImeis = Array.from(imeiSet); // Convertir l'ensemble en un tableau
        // console.log("🚀 ~ checkTasks ~ uniqueImeis:", uniqueImeis);

        // Récupérer les localisations pour les IMEIs spécifiques (mongoDB)
        const Location = createLocationModel(userId);
        const query = {
          imei: { $in: uniqueImeis }, // Condition sur IMEI
          timestamp: { $gte: startOfPreviousDay, $lte: endOfDay }, // Condition sur la date
        };
        const resultQuery = Location.find(query).sort({ timestamp: -1 });
        const Locations = await resultQuery.exec();

        if (Locations.length == 0) {
          continue;
        }

        for (const task of userTasks) {
          const polygonStartCoordinates = JSON.parse(
            task.polygon_start_coordinates
          ).map((coordinates) => coordinates.map((coord) => parseFloat(coord)));

          const polygonDestinationCoordinates = !task.polygon_start_only
            ? JSON.parse(task.polygon_destination_coordinates).map(
                (coordinates) => coordinates.map((coord) => parseFloat(coord))
              )
            : null;

          let isTaskStatusUpdated = false;
          for (const location of Locations) {
            if (task.vehicle.imei == location.imei) {
              if (
                task.status == 0 &&
                pointInPolygon(
                  [location.gps.latitude, location.gps.longitude],
                  polygonStartCoordinates
                ) &&
                task.date_time_start_From <= location.timestamp &&
                task.date_time_start_to >= location.timestamp
              ) {
                isTaskStatusUpdated = true;
                if (task.polygon_start_only) {
                  // Ici la tâche n'a pas de destination
                  await updateTaskStatus(task, 2);
                  const emailMessageQueue = `La tâche <b>${task.name}</b> assignée au véhicule <b>${task.vehicle.make} ${task.vehicle.model}</b> 
                                             pour se déplacer vers la zone <b> ${task.polygon_start_desc} </b> a été accomplie le <b>${location.timestamp}</b>.`;
                  publishDataToEmailQueues(
                    task.user_id,
                    task.user.email,
                    location.timestamp,
                    [{ message: emailMessageQueue }]
                  );
                  break;
                } else if (
                  // Le cas où la date de destination se trouve également dans la plage horaire spécifiée
                  task.date_time_end_From <= location.timestamp &&
                  task.date_time_end_to >= location.timestamp
                ) {
                  await updateTaskStatus(task, 2);
                  const emailMessageQueue = `La tâche <b>${task.name}</b> assignée au véhicule <b>${task.vehicle.make} ${task.vehicle.model}</b>, 
                                             consistant à se déplacer de la zone <b>${task.polygon_start_desc}</b> à la zone de destination <b>${task.polygon_destination_desc}</b>, 
                                             a été accomplie le ${location.timestamp}.
                                            `;
                  publishDataToEmailQueues(
                    task.user_id,
                    task.user.email,
                    location.timestamp,
                    [{ message: emailMessageQueue }]
                  );
                  break;
                } else {
                  await Task.update(
                    {
                      status: 1,
                    },
                    {
                      where: {
                        id: task.id,
                      },
                    }
                  );
                }
                break;
              } else if (
                task.status == 1 &&
                !task.polygon_start_only &&
                pointInPolygon(
                  [location.gps.latitude, location.gps.longitude],
                  polygonDestinationCoordinates
                ) &&
                task.date_time_end_From <= location.timestamp &&
                task.date_time_end_to >= location.timestamp
              ) {
                isTaskStatusUpdated = true;
                await updateTaskStatus(task, 2);
                const emailMessageQueue = `La tâche <b>${task.name}</b> assignée au véhicule <b>${task.vehicle.make} ${task.vehicle.model}</b>, 
                                           consistant à se déplacer de la zone <b>${task.polygon_start_desc}</b> à la zone de destination <b>${task.polygon_destination_desc}</b>, 
                                           a été accomplie le ${location.timestamp}.`;
                publishDataToEmailQueues(
                  task.user_id,
                  task.user.email,
                  location.timestamp,
                  [{ message: emailMessageQueue }]
                );
                break;
              }
            }
          }

          if (!isTaskStatusUpdated) {
            // rechercher le premier "localisation" (NB: trié par ordre du plus récent au plus ancien) dont la propriété "IMEI" correspond à la valeur spécifiée
            const lastLocation = Locations.find(
              (l) => l.imei == task.vehicle.imei
            );

            if (
              lastLocation &&
              task.status == 0 &&
              (task.date_time_start_to < new Date() ||
                task.date_time_start_to < lastLocation.timestamp)
            ) {
              await updateTaskStatus(task, 3);
              const emailMessageQueue = task.polygon_start_only
                ? `La tâche <b>${task.name}</b> assignée au véhicule <b>${task.vehicle.make} ${task.vehicle.model}</b> 
                   pour se déplacer vers la zone <b> ${task.polygon_start_desc} </b> a échoué.`
                : `La tâche <b>${task.name}</b> assignée au véhicule <b>${task.vehicle.make} ${task.vehicle.model}</b>, 
                   consistant à se déplacer de la zone <b>${task.polygon_start_desc}</b> à la zone de destination <b>${task.polygon_destination_desc}</b>, a été echoué.`;
              publishDataToEmailQueues(
                task.user_id,
                task.user.email,
                new Date(),
                [{ message: emailMessageQueue }]
              );
              break;
            } else if (
              lastLocation &&
              task.status == 1 &&
              (task.date_time_end_to < new Date() ||
                task.date_time_end_to < lastLocation.timestamp)
            ) {
              await updateTaskStatus(task, 3);
              const emailMessageQueue = `La tâche <b>${task.name}</b> assignée au véhicule <b>${task.vehicle.make} ${task.vehicle.model}</b>, 
                                         consistant à se déplacer de la zone <b>${task.polygon_start_desc}</b> à la zone de destination <b>${task.polygon_destination_desc}</b>, 
                                         a été echoué.`;
              publishDataToEmailQueues(
                task.user_id,
                task.user.email,
                new Date(),
                [{ message: emailMessageQueue }]
              );
              break;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  async function updateTaskStatus(task, status) {
    let transaction;
    try {
      transaction = await sequelize.transaction();
      // Supprimer la tâche existante de la table "tasks"
      await Task.destroy({ where: { id: task.id }, transaction });
      // Créer une nouvelle entrée dans la table "tasks_histories" pour archiver la tâche
      await TaskHistory.create(
        {
          vehicle_id: task.vehicle_id,
          name: task.name,
          description: task.description,
          status: status,
          polygon_start: task.polygon_start,
          polygon_start_desc: task.polygon_start_desc,
          polygon_start_coordinates: task.polygon_start_coordinates,
          polygon_destination: task.polygon_destination,
          polygon_destination_desc: task.polygon_destination_desc,
          polygon_destination_coordinates: task.polygon_destination_coordinates,
          date_time_start_From: task.date_time_start_From,
          date_time_start_to: task.date_time_start_to,
          date_time_end_From: task.date_time_end_From,
          date_time_end_to: task.date_time_end_to,
          user_id: task.user_id,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Erreur lors de l'exécution de la transaction :", error);
    }
  }

  const cronExpression = "*/20 * * * *"; // Configuration job toutes les 20 min
  const job = new CronJob(cronExpression, checkTasks, null, true, "UTC");
  console.log("Job de verification des tasks ...");

  // Laissez le processus s'exécuter indéfiniment (ou jusqu'à ce que vous le stoppiez)
  process.on("SIGINT", () => {
    console.log("Arrêt du job de verification de tasks.");
    process.exit();
  });
})();

// NB: Utiliser CMD pour lancer le script en entrant la commande suivante: node tasks/tasks-completion-checker-job.js

#!/bin/bash

# Fonction pour vérifier et redémarrer un service si nécessaire
restart_service_if_inactive() {
  service_name=$1
  current_time=$(date +"%d-%m-%Y %T")
  systemctl status $service_name > /dev/null 2>&1
  if [ $? -eq 0 ]; then # Le code de retour 0 indique généralement que la commande s'est terminée sans erreur.
    echo "$current_time - $service_name is running."
  else
    echo "$current_time - $service_name is not running. Restarting $service_name..."
    systemctl restart $service_name
    systemctl status $service_name > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "$current_time - $service_name has been successfully restarted."
    else
      echo "$current_time - Failed to restart $service_name."
    fi
  fi
}

# Liste des services à vérifier
services=("mongod" "mysql" "redis-server" "rabbitmq-server")

# Parcourir la liste des services et redémarrer si nécessaire
for service in "${services[@]}"
do
  restart_service_if_inactive "$service" || all_services_ok=false
done

# Vérifier s'il y a eu des erreurs lors de la vérification des services
current_time=$(date +"%d-%m-%Y %T")
if [ "$all_services_ok" != false ]; then
  echo "$current_time - ✅ Tous les services sont opérationnels."
else
  echo "$current_time - ⚠️ Au moins un service a rencontré une erreur. Redémarrage des services avec pm2..."
  cd ../
  pm2 restart 0 1
fi

echo ""

# NB: pour exécuter le script toutes les 2 minutes dans cron: 
# 1 - Verifier la permession: root@ubuntu-20:~# chmod +x gps_nodejs/bin/check_and_restart_services.sh
# 2 - Ouvrir votre crontab en utilisant la commande: root@ubuntu-20:~# crontab -e
# 3 - Et ajouter la tâche cron suivant: */2 * * * * /root/gps_nodejs/bin/check_and_restart_services.sh >> /root/gps_nodejs/logs/check_and_restart_services.log 2>&1

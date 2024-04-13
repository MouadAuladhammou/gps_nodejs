#!/bin/bash

# demarer server
pm2 start

# demarer service mailing
cd ../mail_service/mail_service/ 
pm2 start

# demarer Proxy
cd ../../
cd api_gateway/api_gateway/
pm2 start

# Remarque: 
# Il faut donner la permesiion: root@ubuntu-20:~/gps_nodejs# chmod +x setup.sh 
# Ensuite, vous pouvez exécuter le fichier avec la commande suivante: root@ubuntu-20:~/gps_nodejs# ./setup.sh
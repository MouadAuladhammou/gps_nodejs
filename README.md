## Projet Tracker GPS
Plateforme logicielle de traitement de flux.  Il s’agit d’une application web dédié à la géolocalisation en temps réel des véhicules :
* Visualisez la position et l’emplacement exacte de chaque véhicule sur un Dashboard intuitif, avec des données claires et faciles à lire.
* Consultez en temps réel l’état de votre véhicule et voir s’il est en marche ou en arrêt.
* Gardez l’historique de la vitesse minimale, la vitesse maximale et la vitesse moyenne pour l’ensemble des trajets effectués. 

## Technologies utilisées
* Récepteur GPS : Localisateur GPS pour suivre les véhicules)
* Kafka : Stream processing
* Socket : Ouvrir des canaux de communication bidirectionnelle entre le navigateur (côté client) et le serveur
* Framework AngularJs : développement Front end
* NodeJs : développement Back end
* Mysql/MongoDB : Gestion des données
* Redux : Gestion des caches

## Projet Tracker GPS (Back End)
https://github.com/MouadAuladhammou/gps_nodejs

## Architectures
> Architecture système Kafka :

![image](https://user-images.githubusercontent.com/116977929/199102768-db2b5e5c-a5af-48f3-a4f1-9e91d53a32be.png)

<br />

> Architecture générale du projet :

![image](https://user-images.githubusercontent.com/116977929/199102842-64f1371b-27f2-42bd-bb42-656d39750d46.png)

> Architecture Mysql :

![image](https://user-images.githubusercontent.com/116977929/204658792-9f218345-e076-4a8b-b55d-32c43afeaed0.png)

> Architecture MongoDB :

* Chaque mois a sa propre base de données
* Chaque véhicule a une collection<br />
Exp : db_gps_10_2022 (DB) -> vehicle_10 (Collection) -> {vehicle_id, latitude, longitude, datetime}<br />
NB: vehicle_10 => 10 c'est ID du véhicule

## Captures

![image](https://user-images.githubusercontent.com/116977929/199321936-f10f9098-221c-45e8-b6b2-2e38e49c1e19.png)





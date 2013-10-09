Fédération // frontend
=====================

Cette application constitue la partie client du [site web](http://federation.ens-lyon.fr) de la Fédération des Associations de l'ENS de Lyon.

Installiation des dépendances
-----------------------------

Plusieurs outils sont nécessaires, notamment _gem_ et _npm_ pour l'installation de paquets Ruby et JS.


### SASS (et Bourbon) pour la gestion des styles.

```bash
gem install bourbon
```

Puis, dans le dossier app/styles :

```bash
bourbon install
```

### Bower pour les dépendances Javascript

[Bower](http://www.bower.io) est un gestionnaire de paquets pour le Web, il permet une gestion fine des dépendances au sein d'une application Web. Pour l'installer :

```bash
npm install -g bower
```

Pour l'exécution :

```bash
# La première fois
bower install
# Les autres fois
bower update
```



### Grunt pour la compilation de l'application

[Grunt](http://www.gruntjs.com) permet d'automatiser la gestion de tâches multiples (vérification du code, compilation des styles et scripts, lancement de serveurs…).

```bash
npm install -g grunt-cli
```

Puis ensuite :

* ``` grunt server ``` pour lancer un serveur de test en local ;
* ``` grunt build ``` pour compiler l'application dans le sous-dossier dist.
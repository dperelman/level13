// Functions to handle cheats, either from the console or UI
define(['ash',
    'game/constants/GameConstants',
    'game/constants/CheatConstants',
    'game/constants/ItemConstants',
    'game/constants/PerkConstants',
    'game/constants/FightConstants',
    'game/constants/UpgradeConstants',
    'game/components/common/CampComponent',
    'game/components/player/AutoPlayComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode'
], function (Ash,
    GameConstants,
    CheatConstants,
    ItemConstants,
    PerkConstants,
    FightConstants,
    UpgradeConstants,
    CampComponent,
    AutoPlayComponent,
    ItemsComponent,
    PerksComponent,
    EnemiesComponent,
    SectorImprovementsComponent,
    SectorFeaturesComponent,
    PlayerStatsNode,
    TribeUpgradesNode,
    PlayerPositionNode,
    PlayerLocationNode
) {
    var CheatSystem = Ash.System.extend({
        
        cheatDefinitions: {},
        
        constructor: function (gameState, playerActionFunctions, resourcesHelper, uiMapHelper) {
            this.gameState = gameState;
            this.playerActionFunctions = playerActionFunctions;
            this.resourcesHelper = resourcesHelper;
            this.uiMapHelper = uiMapHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.engine.extraUpdateTime = 0;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
            
            this.registerCheats();
        },
        
        registerCheats: function () {
            this.registerCheat(CheatConstants.CHEAT_NAME_CHEATLIST, "Print all available cheats to console.", [], function () {
                this.printCheats();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_SPEED, "Sets the speed of the game.", ["speed (1 = normal, >1 faster, <1 slower)"], function (params) {
                var spd = parseFloat(params[0]);
                this.setGameSpeed(spd);                
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TIME, "Immediately passes in-game time.", ["time to pass in minutes"], function (params) {
                var mins = parseFloat(params[0]);
                this.passTime(mins);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_RES, "Set a resource to a given value.", ["resource name", "amount"], function (params) {
                var name = params[0];
                var amount = parseInt(params[1]);
                this.setResource(name, amount);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_SUPPLIES, "Refill supplies (water and food).", [], function () {
                this.addSupplies();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_VISION, "Set vision.", ["value"], function (params) {
                this.playerStatsNodes.head.vision.value = Math.min(200, Math.max(0, parseInt(params[0])));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_EVIDENCE, "Set evidence.", ["value"], function (params) {
                this.playerStatsNodes.head.evidence.value = Math.max(0, parseInt(params[0]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_RUMOURS, "Set rumours.", ["value"], function (params) {
                this.playerStatsNodes.head.rumours.value = Math.max(0, parseInt(params[0]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_POPULATION, "Add population to nearest camp.", ["value (1-n)"], function (params) {
                this.addPopulation(Math.max(1, parseInt(params[0])));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_STAMINA, "Refill stamina for free.", [], function () {
                this.refillStamina();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_POS, "Set position of the player. Must be an existing sector.", ["level", "x", "y"], function (params) {
                this.setPlayerPosition(parseInt(params[0]), parseInt(params[1]), parseInt(params[2]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_HEAL, "Heal injuries.", [], function () {
                this.heal();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_INJURY, "Add a random injury.", [], function () {
                this.addInjury();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_BUILDING, "Add buildings to the current camp.", ["building id", "amount"], function (params) {
                var buildingName = params[0];
                var buildingAmount = parseInt(params[1]);
                this.addBuilding(buildingName, buildingAmount);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_TECH, "Immediately unlock the given upgrade.", ["upgrade id"], function (params) {
                this.addTech(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_BLUEPRINT, "Adds blueprints for the given upgrade.", ["upgrade id", "amount (1-total)"], function (params) {
                this.addBlueprints(params[0], parseInt(params[1]));
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_ITEM, "Add the given item to inventory.", ["item id"], function (params) {
                this.addItem(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_PERK, "Add the given perk to the player.", ["perk id"], function (params) {
                this.addPerk(params[0]);
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_FOLLOWER, "Add random follower.", [], function (params) {
                this.addFollower();
            });
            this.registerCheat(CheatConstants.CHEAT_NAME_REVEAL_MAP, "Reveal the map (show important locations without scouting).", ["true/false"], function (params) {
                this.revealMap(params[0]);
            });
        },
        
        registerCheat: function(cmd, desc, params, func) {
            this.cheatDefinitions[cmd] = {};
            this.cheatDefinitions[cmd].desc = desc;
            this.cheatDefinitions[cmd].params = params;
            this.cheatDefinitions[cmd].func = func;
        },

        applyCheat: function (input) {
            if (!GameConstants.isCheatsEnabled) return; 
            
            var inputParts = input.split(" ");
            var name = inputParts[0]; 
            
            if (this.cheatDefinitions[name]) {
                var func = this.cheatDefinitions[name].func;
                var numParams = this.cheatDefinitions[name].params.length;
                if (inputParts.length === numParams + 1) {                    
                    func.call(this, inputParts.slice(1));
                } else {
                    console.log("Wrong number of parameters. Expected " + numParams + " got " + (inputParts.length -1));
                }
                return;
            } else {
                console.log("cheat not found: " + name);
            }
            
            // TODO fix autoplay & reimplement print cheats if used
            /*
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            switch (name) {
                case CheatConstants.CHEAT_NAME_AUTOPLAY:
                    var param1 = inputParts[1];
                    var param2 = parseInt(inputParts[2]);
                    this.setAutoPlay(param1, param2);
                    break;
                case "printSector":
                    console.log(currentSector.get(SectorFeaturesComponent));
                    break;

                case "printEnemies":
                    var enemiesComponent = currentSector.get(EnemiesComponent);
                    var playerStamina = this.playerStatsNodes.head.stamina;
                    if (enemiesComponent.possibleEnemies.length < 1)
                        console.log("No enemies here.");
                    for (var e = 0; e < enemiesComponent.possibleEnemies.length; e++) {
                        var enemy = enemiesComponent.possibleEnemies[e];
                        console.log(
                            enemy.name + " " +
                            "(att: " + enemy.att + ", def: " + enemy.def + ", rarity: " + enemy.rarity + ") " +
                            "chances: " + Math.round(100 * FightConstants.getFightWinProbability(enemy, playerStamina, itemsComponent)) + "% " +
                            FightConstants.getFightChances(enemy, playerStamina, itemsComponent));
                    }
                    break;
            }
            */
        },
        
        printCheats: function () {
            for (var cmd in this.cheatDefinitions) {
                var hasParams = this.cheatDefinitions[cmd].params.length > 0;
                var params = "";
                for (var i = 0; i < this.cheatDefinitions[cmd].params.length; i++) {
                    params += "[" + this.cheatDefinitions[cmd].params[i] + "] ";
                }
                console.log(cmd + " " + params + "- " + this.cheatDefinitions[cmd].desc);
            }
        },
        
        getCheatListDiv: function() {
            var div = "<div>";
            div += "<h4 class='infobox-scrollable-header'>Cheat List</h4>";
            div += "<div id='cheatlist' class='infobox infobox-scrollable'>";
            for (var cmd in this.cheatDefinitions) {
                var hasParams = this.cheatDefinitions[cmd].params.length > 0;
                var params = "";
                for (var i = 0; i < this.cheatDefinitions[cmd].params.length; i++) {
                    params += "[" + this.cheatDefinitions[cmd].params[i] + "] ";
                }
                div += ("<b>" + cmd + "</b>" + " " + params + "- " + this.cheatDefinitions[cmd].desc) + "<br/>";
            }            
            div += "</div>";
            div += "</div>";
            return div;
        },
        
        setGameSpeed: function (speed) {            
            GameConstants.gameSpeedCamp = speed;
            GameConstants.gameSpeedExploration = speed;
        },
        
        passTime: function (mins) {
            this.engine.updateComplete.addOnce(function () {
                this.engine.extraUpdateTime = mins * 60;
                var cooldownkeys = Object.keys(this.gameState.actionCooldownEndTimestamps);                
                for (var i = 0; i < cooldownkeys.length; i++) {
                    this.gameState.actionCooldownEndTimestamps[cooldownkeys[i]] = this.gameState.actionCooldownEndTimestamps[cooldownkeys[i]] - mins * 60 * 1000;
                }
                this.playerActionFunctions.uiFunctions.onPlayerMoved(); // reset cooldowns for buttons
                this.engine.updateComplete.addOnce(function () {
                    this.engine.extraUpdateTime = 0;
                }, this);
            }, this);
        },
        
        setAutoPlay: function (type, numCampsTarget) {
            var endConditionUpdateFunction;
            var start = false;
            var stop = false;
            switch (type) {
                case "false":
                case "off":
                    stop = true;
                    break;
                    
                case "true":
                case "on":
                    start = true;
                    break;
                    
                case "camp":
                    this.cheat("item " + ItemConstants.itemDefinitions.bag[0].id);
                    if (!numCampsTarget || numCampsTarget < 1) numCampsTarget = 1;
                    endConditionUpdateFunction = function () {
                        if (this.gameState.numCamps >= numCampsTarget) {
                            this.engine.updateComplete.remove(endConditionUpdateFunction, this);
                            this.cheat("autoplay off");
                        }
                    };
                    break;
            }
            
            if (endConditionUpdateFunction) this.engine.updateComplete.add(endConditionUpdateFunction, this);
            
            if (stop) {
                this.playerStatsNodes.head.entity.remove(AutoPlayComponent);
            } else if (start) {                
                if (!this.playerStatsNodes.head.entity.has(AutoPlayComponent)) {
                    this.playerStatsNodes.head.entity.add(new AutoPlayComponent());
                }
            }
        },
        
        setResource: function (name, amount) {
            if (resourceNames[name]) {
                var playerResources = this.resourcesHelper.getCurrentStorage().resources;
                playerResources.setResource(name, amount);
            } else {
                console.log(name + " is not a valid resource. Possible names are:");
                console.log(Object.keys(resourceNames));
            }
        },
        
        addSupplies: function () {
            var playerResources = this.resourcesHelper.getCurrentStorage().resources;        
            playerResources.setResource("food", 15);
            playerResources.setResource("water", 15);
        },
        
        addPopulation: function (amount) {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var camp = currentSector.get(CampComponent);
            if (camp) {                
                camp.addPopulation(amount);
            } else {
                console.log("WARN: Camp not found.");
            }
        },
        
        refillStamina: function () {
            this.playerStatsNodes.head.stamina.stamina = 1000;        
        },
        
        setPlayerPosition: function (lvl, x, y) {            
            var playerPos = this.playerPositionNodes.head.position;
            playerPos.level = lvl;
            playerPos.sectorX = x;
            playerPos.sectorY = y;
        },
        
        addBuilding: function (name, amount) {
            var currentSector = this.playerLocationNodes.head ? this.playerLocationNodes.head.entity : null;
            var improvementsComponent = currentSector.get(SectorImprovementsComponent);
            improvementsComponent.add(name, amount);
        },
        
        addTech: function (name) {
            if (name !== "all")
                this.playerActionFunctions.buyUpgrade(name, true);
            else
                for (var id in UpgradeConstants.upgradeDefinitions) {
                    this.playerActionFunctions.buyUpgrade(id, true);
                }            
        },
        
        addBlueprints: function (name, amount) {
            var maxPieces = UpgradeConstants.getMaxPiecesForBlueprint(name);
            amount = Math.max(1, amount);
            amount = Math.min(amount, maxPieces);
            for (var i = 0; i < amount; i++) {
                this.tribeUpgradesNodes.head.upgrades.addNewBlueprintPiece(name);
            }
            this.gameState.unlockedFeatures.blueprints = true;
        },
        
        addItem: function (itemID) {            
            var itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
            var playerPos = this.playerPositionNodes.head.position;
            var item = ItemConstants.getItemByID(itemID);
            if (item) {
                itemsComponent.addItem(item.clone(), !playerPos.inCamp);
            } else {
                console.log("WARN: No such item: " + itemID);
            }
        },
        
        addFollower: function() {    
            var campCount = this.gameState.numCamps;        
            var follower = ItemConstants.getFollower(this.playerPositionNodes.head.position.level, campCount);
            this.playerActionFunctions.addFollower(follower);
        },
        
        addPerk: function () {            
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            var perk = PerkConstants.getPerk(perkID);
            if (perk) {
                perksComponent.addPerk(perk);
            } else {
                console.log("WARN: No such perk: " + perkID);
            }
        },
        
        heal: function() {  
            this.playerActionFunctions.useHospital(true);
        },
        
        addInjury: function () {       
            var perksComponent = this.playerPositionNodes.head.entity.get(PerksComponent);
            var injuryi = Math.round(Math.random() * PerkConstants.perkDefinitions.injury.length);
            var defaultInjury = PerkConstants.perkDefinitions.injury[injuryi];
            perksComponent.addPerk(defaultInjury.clone());
        },
        
        revealMap: function (value) {            
            this.uiMapHelper.isMapRevealed = value ? true : false;
        }
    
    });

    return CheatSystem;
});
// A system that updates a global resources based on the camps' resources. Rules:
// - player not in camp: player carries all resources
// - player/worker in camp with no trading post: camp has resources
// - player/worker in camp with trading post: moved to tribe resources
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/nodes/sector/CampResourcesNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/tribe/TribeResourcesNode',
	'game/components/common/CurrencyComponent',
	'game/components/tribe/UpgradesComponent',
	'game/constants/CampConstants'
], function (Ash, GameGlobals, GlobalSignals,
	CampResourcesNode, PlayerResourcesNode, TribeResourcesNode,
	CurrencyComponent, UpgradesComponent,
	CampConstants) {
	var GlobalResourcesSystem = Ash.System.extend({
		
		playerNodes: null,
		campNodes: null,
		tribeNodes: null,
		
		constructor: function () {
		},

		addToEngine: function (engine) {
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			this.campNodes = engine.getNodeList(CampResourcesNode);
			this.tribeNodes = engine.getNodeList(TribeResourcesNode);

			GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, this.onInventoryChanged);
		},

		removeFromEngine: function (engine) {
			this.playerNodes = null;
			this.campNodes = null;
			this.tribeNodes = null;
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			this.updateCampsResources();
			this.updateTribeResources();
			this.updatePlayerResources();
		},
		
		updateCampsResources: function () {
			var storageUpgradeLevel = this.getStorageUpgradeLevel();
			
			for (var node = this.campNodes.head; node; node = node.next) {
				let campImprovements = node.improvements;
				let storageCount = campImprovements.getCount(improvementNames.storage);
				let storageLevel = campImprovements.getLevel(improvementNames.storage);
				let hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
				let storageCapacity = CampConstants.getStorageCapacity(storageCount, storageLevel);
				node.resources.storageCapacity = storageCapacity;
				let spilledResources = node.resources.limitToStorage(!hasTradePost);
				this.updateSpilledResources(spilledResources);
				
				this.updateCampSpecialStorage(node);
			}
		},
		
		updateTribeResources: function () {
			var globalResourcesComponent = this.tribeNodes.head.resources;
			var globalResources = globalResourcesComponent.resources;
			var globalResourceAccumulationComponent = this.tribeNodes.head.resourceAccumulation;
			var globalCurrency = this.tribeNodes.head.entity.get(CurrencyComponent);
			
			var updateSectorResource = function (node, name) {
				var amount = node.resources.resources.getResource(name);
				globalResources.addResource(name, amount, "update-sector-to-tribe");
				node.resources.resources.addResource(name, -amount, "update-sector-to-tribe");
			};
			
			var updateSectorResAcc = function (node, name) {
				var sources = node.resourceAccumulation.getSources(name);
				if (sources) {
					for (let i = 0; i < sources.length; i++) {
						var source = sources[i];
						globalResourceAccumulationComponent.addChange(name, source.amount, source.source, source.sourceCount);
					}
				}
			};
			
			var updateSectorCurrency = function (node) {
				var currency = node.currency;
				var amount = currency.currency;
				globalCurrency.currency += amount;
				currency.currency = 0;
			};
			
			var campImprovements;
			var hasTradePost;
			var numCamps = 0;
			var numCampsInTradeNetwork = 0;
			for (var node = this.campNodes.head; node; node = node.next) {
				campImprovements = node.improvements;
				hasTradePost = campImprovements.getCount(improvementNames.tradepost) > 0;
				if (hasTradePost) {
					for (var key in resourceNames) {
						var name = resourceNames[key];
						if (!CampConstants.isLocalResource(name)) {
							updateSectorResource(node, name);
							updateSectorResAcc(node, name);
						}
					}
					updateSectorCurrency(node);
					globalResourcesComponent.storageCapacity += node.resources.storageCapacity;
					numCampsInTradeNetwork++;
				}
				
				numCamps++;
			}
			
			this.tribeNodes.head.tribe.numCamps = numCamps;
			this.tribeNodes.head.tribe.numCampsInTradeNetwork = numCampsInTradeNetwork;
			
			let spilledResources = globalResourcesComponent.limitToStorage(true);
			this.updateSpilledResources(spilledResources);
		},
		
		updatePlayerResources: function () {
			this.playerNodes.head.resources.limitToStorage(true);
		},
		
		updateUnlockedResources: function () {
			var playerResources = this.playerNodes.head.resources.resources;
			var globalResourcesComponent = this.tribeNodes.head.resources;
			var globalResources = globalResourcesComponent.resources;
			
			var gameState = GameGlobals.gameState;
			var campNodes = this.campNodes;
			var checkUnlockedResource = function (name) {
				if (gameState.unlockedFeatures["resource_" + name]) return;
				
				let shouldUnlock = false;
				if (playerResources[name] > 0) shouldUnlock = true;
				for (var node = campNodes.head; node; node = node.next) {
					if (node.resources.resources[name] > 0) {
						shouldUnlock = true;
						break;
					}
				}
				if (globalResources[name] > 0) shouldUnlock = true;
				
				if (shouldUnlock) {
					GameGlobals.playerActionFunctions.unlockFeature("resource_" + name);
				}
			};
			
			checkUnlockedResource("food");
			checkUnlockedResource("water");
			checkUnlockedResource("metal");
			checkUnlockedResource("rope");
			checkUnlockedResource("herbs");
			checkUnlockedResource("fuel");
			checkUnlockedResource("rubber");
			checkUnlockedResource("medicine");
			checkUnlockedResource("concrete");
			checkUnlockedResource("robots");
			checkUnlockedResource("tools");
		},
		
		updateCampSpecialStorage: function (node) {
			let maxRobots = GameGlobals.campHelper.getRobotStorageCapacity(node.entity);
			node.resources.resources.limit(resourceNames.robots, 0, maxRobots, true, "max-robots");
		},

		updateSpilledResources: function (spilledResources) {
			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = spilledResources.getResource(name);
				if (amount > 0) {
					GameGlobals.gameState.increaseGameStatKeyed("amountResourcesOverflownPerName", name, amount);
				}
			}
		},
		
		onInventoryChanged: function () {
			this.updateUnlockedResources();
		},
		
		getStorageUpgradeLevel: function () {
			return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.storage, this.tribeNodes.head.entity.get(UpgradesComponent));
		},
		
	});

	return GlobalResourcesSystem;
});

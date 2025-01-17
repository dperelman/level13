// A class that checks raw user input from the DOM and passes game-related actions to PlayerActionFunctions
define(['ash',
		'core/ExceptionHandler',
		'game/GameGlobals',
		'game/GlobalSignals',
		'game/constants/GameConstants',
		'game/constants/CampConstants',
		'game/constants/EnemyConstants',
		'game/constants/UIConstants',
		'game/constants/ItemConstants',
		'game/constants/PlayerActionConstants',
		'game/constants/PlayerStatConstants',
		'game/helpers/ui/UIPopupManager',
		'game/vos/ResourcesVO',
		'game/vos/PositionVO',
		'utils/MathUtils',
		'utils/StringUtils',
	],
	function (Ash, ExceptionHandler, GameGlobals, GlobalSignals, GameConstants, CampConstants, EnemyConstants, UIConstants, ItemConstants, PlayerActionConstants, PlayerStatConstants, UIPopupManager, ResourcesVO, PositionVO, MathUtils, StringUtils) {

		// TODO separate generic utils and tabs handling to a different file

		var UIFunctions = Ash.Class.extend({

			context: "UIFunctions",
			popupManager: null,

			hotkeys: {},

			HOTKEY_DEFAULT_MODIFIER: "HOTKEY_DEFAULT_MODIFIER",
			HOTKEY_DEFAULT_MODIFIER_KEY: "shiftKey",

			elementIDs: {
				tabs: {
					bag: "switch-bag",
					followers: "switch-followers",
					projects: "switch-projects",
					map: "switch-map",
					trade: "switch-trade",
					in: "switch-in",
					out: "switch-out",
					upgrades: "switch-upgrades",
					world: "switch-world",
					milestones: "switch-milestones",
					embark: "switch-embark"
				},
			},

			constructor: function () {
				this.popupManager = new UIPopupManager(this);
			},
			
			init: function () {
				this.registerHotkeys();
				this.generateElements();
				this.hideElements();
				this.registerListeners();
				this.registerGlobalMouseEvents();
			},

			registerListeners: function () {
				var uiFunctions = this;

				$(window).resize(this.onResize);

				// Switch tabs
				var onTabClicked = this.onTabClicked;
				$.each($("#switch-tabs li"), function () {
					$(this).click(function () {
						if (!($(this).hasClass("disabled"))) {
							onTabClicked(this.id);
						}
					});
				});

				// Collapsible divs
				this.registerCollapsibleContainerListeners("");

				// Steppers and stepper buttons
				this.registerStepperListeners("");

				// Action buttons buttons
				this.registerActionButtonListeners("");

				// Meta/non-action buttons
				$("#btn-save").click(function (e) {
					GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, true);
				});
				$("#btn-restart").click(function (e) {
					uiFunctions.onRestartButton();
				});
				$("#btn-more").click(function (e) {
					let wasVisible = $("#game-options-extended").is(":visible");
					uiFunctions.showGameOptions(!wasVisible);
				});
				$("#btn-importexport").click(function (e) {
					gtag('event', 'screen_view', {
						'screen_name': "popup-manage-save"
					});
					uiFunctions.showManageSave();
				});
				$("#btn-stats").click(function (e) {
					let options = { isMeta: true, isDismissable: true };
					gtag('event', 'screen_view', {
						'screen_name': "popup-stats"
					});
					uiFunctions.updateGameStatsPopup();
					uiFunctions.showSpecialPopup("game-stats-popup", options);
				});
				$("#game-stats-popup-close").click(function (e) {
					uiFunctions.popupManager.closePopup("game-stats-popup");
				});
				$("#btn-settings").click(function (e) {
					let options = { isMeta: true, isDismissable: true };
					gtag('event', 'screen_view', {
						'screen_name': "popup-settings"
					});
					uiFunctions.showSpecialPopup("settings-popup", options);
				});
				$("#settings-popup-close").click(function (e) {
					uiFunctions.popupManager.closePopup("settings-popup");
				});
				$("#btn-info").click(function (e) {
					gtag('event', 'screen_view', {
						'screen_name': "popup-game-info"
					});
					uiFunctions.showInfoPopup("Level 13", uiFunctions.getGameInfoDiv(), null, null, null, true, true);
				});

				$("#in-assign-workers input.amount").change(function (e) {
					var assignment = {};
					for (var key in CampConstants.workerTypes) {
						assignment[key] = parseInt($("#stepper-" + key + " input").val());
					}
					GameGlobals.playerActionFunctions.assignWorkers(null, assignment);
				});

				// Buttons: In: Other
				$("#btn-header-rename").click(function (e) {
					var prevCampName = GameGlobals.playerActionFunctions.getNearestCampName();
					uiFunctions.showInput(
						"Rename Camp",
						"Give your camp a new name",
						prevCampName,
						true,
						function (input) {
							GameGlobals.playerActionFunctions.setNearestCampName(input);
						},
						null,
						CampConstants.MAX_CAMP_NAME_LENGTH
					);
				});
				
				$(document).on("keyup", this.onKeyUp);
			},

			registerGlobalMouseEvents: function () {
				GameGlobals.gameState.uiStatus.mouseDown = false;
				GameGlobals.gameState.uiStatus.mouseDownElement = null;
				$(document).on('mouseleave', function (e) {
					GameGlobals.gameState.uiStatus.mouseDown = false;
					GameGlobals.gameState.uiStatus.mouseDownElement = null;
				});
				$(document).on('mouseup', function (e) {
					GameGlobals.gameState.uiStatus.mouseDown = false;
					GameGlobals.gameState.uiStatus.mouseDownElement = null;
				});
				$(document).on('mousedown', function (e) {
					GameGlobals.gameState.uiStatus.mouseDown = true;
					GameGlobals.gameState.uiStatus.mouseDownElement = e.target;
				});
			},

			registerHotkeys: function () {
				let tabs = GameGlobals.uiFunctions.elementIDs.tabs;
				let defaultModifier = this.HOTKEY_DEFAULT_MODIFIER;
				this.registerHotkey("Move N", "KeyW", defaultModifier, tabs.out, false, "move_sector_north");
				this.registerHotkey("Move N", "Numpad8", defaultModifier, tabs.out, false, "move_sector_north");
				this.registerHotkey("Move W", "KeyA", defaultModifier, tabs.out, false, "move_sector_west");
				this.registerHotkey("Move W", "Numpad4", defaultModifier, tabs.out, false, "move_sector_west");
				this.registerHotkey("Move S", "KeyS", defaultModifier, tabs.out, false, "move_sector_south");
				this.registerHotkey("Move S", "Numpad0", defaultModifier, tabs.out, false, "move_sector_south");
				this.registerHotkey("Move E", "KeyD", defaultModifier, tabs.out, false, "move_sector_east");
				this.registerHotkey("Move E", "Numpad6", defaultModifier, tabs.out, false, "move_sector_east");
				this.registerHotkey("Move NW", "KeyQ", defaultModifier, tabs.out, false, "move_sector_nw");
				this.registerHotkey("Move NW", "Numpad7", defaultModifier, tabs.out, false, "move_sector_nw");
				this.registerHotkey("Move NE", "KeyE", defaultModifier, tabs.out, false, "move_sector_ne");
				this.registerHotkey("Move NE", "Numpad9", defaultModifier, tabs.out, false, "move_sector_ne");
				this.registerHotkey("Move SW", "KeyZ", defaultModifier, tabs.out, false, "move_sector_sw");
				this.registerHotkey("Move SW", "Numpad1", defaultModifier, tabs.out, false, "move_sector_sw");
				this.registerHotkey("Move SE", "KeyC", defaultModifier, tabs.out, false, "move_sector_se");
				this.registerHotkey("Move SE", "Numpad3", defaultModifier, tabs.out, false, "move_sector_se");

				this.registerHotkey("Scavenge", "KeyN", defaultModifier, tabs.out, false, "scavenge");
				this.registerHotkey("Scout", "KeyM", defaultModifier, tabs.out, false, "scout");
				this.registerHotkey("Collect water", "KeyG", defaultModifier, tabs.out, false, "use_out_collector_water");
				this.registerHotkey("Collect food", "KeyF", defaultModifier, tabs.out, false, "use_out_collector_food");

				this.registerHotkey("Previous tab", "ArrowLeft", "shiftKey", null, false, () => GameGlobals.uiFunctions.showPreviousTab());
				this.registerHotkey("Next tab", "ArrowRight", "shiftKey", null, false, () => GameGlobals.uiFunctions.showNextTab());

				this.registerHotkey("Dismiss popup", "Escape", null, null, true, () => GameGlobals.uiFunctions.popupManager.dismissPopups());
			},

			registerHotkey: function (description, code, modifier, tab, isUniversal, cb) {
				if (!code) return;
				if (!cb) return;

				modifier = modifier || null;
				tab = tab || null;
				isUniversal = isUniversal || false;

				let displayKey = code.replace("Key", "");
				let displayKeyShort = displayKey.replace("Numpad", "");

				let action = null;
				if (typeof cb === "string") {
					action = cb;
					cb = () => GameGlobals.playerActionFunctions.startAction(action);
				}

				let activeCondition = null;

				if (action && action.indexOf("move_") >= 0) {
					if (code.indexOf("Numpad") >= 0) {
						activeCondition = () => GameGlobals.gameState.settings.hotkeysNumpad;
					} else {
						activeCondition = () => !GameGlobals.gameState.settings.hotkeysNumpad;
					}
				}

				if (!this.hotkeys[code]) this.hotkeys[code] = [];

				let hotkey = { 
					activeCondition: activeCondition,
					code: code, 
					modifier: modifier, 
					description: description, 
					displayKey: displayKey, 
					displayKeyShort: displayKeyShort,
					tab: tab, 
					isUniversal: isUniversal,
					action: action, 
					cb: cb 
				};
				this.hotkeys[code].push(hotkey);
			},

			getActionHotkey: function (action) {
				if (!action) return null;
				for (let code in this.hotkeys) {
					for (let i = 0; i < this.hotkeys[code].length; i++) {
						let hotkey = this.hotkeys[code][i];
						if (hotkey.activeCondition && !hotkey.activeCondition()) continue;
						if (hotkey.action == action) return hotkey;
					}
				}
				return null;
			},

			registerActionButtonListeners: function (scope) {
				var uiFunctions = this;
				var gameState = GameGlobals.gameState;

				// All action buttons
				$.each($(scope + " button.action"), function () {
					var $element = $(this);
					if ($element.hasClass("click-bound")) {
						log.w("trying to bind click twice! id: " + $element.attr("id"));
						return;
					}
					if ($element.hasClass("action-manual-trigger")) {
						return;
					}
					$element.addClass("click-bound");
					$element.click(ExceptionHandler.wrapClick(function (e) {
						var action = $(this).attr("action");
						if (!action) {
							log.w("No action mapped for button.");
							return;
						}
						
						GlobalSignals.actionButtonClickedSignal.dispatch(action);

						var param = null;
						var actionIDParam = GameGlobals.playerActionsHelper.getActionIDParam(action);
						if (actionIDParam) param = actionIDParam;
						let isProject = $(this).hasClass("action-level-project");
						if (isProject) param = $(this).attr("sector");
						if (!param) param = GameGlobals.playerActionsHelper.getActionDefaultParam();

						let locationKey = uiFunctions.getLocationKey(action);
						let isStarted = GameGlobals.playerActionFunctions.startAction(action, param);
						if (!isStarted) {
							uiFunctions.updateButtonCooldown($(this), action);
							return;
						}

						var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
						var duration = PlayerActionConstants.getDuration(action, baseId);
						if (duration > 0) {
							GameGlobals.gameState.setActionDuration(action, locationKey, duration);
							uiFunctions.startButtonDuration($(this), duration);
						}
					}));
				});

				// Special actions
				$(scope + "#out-action-fight-confirm").click(function (e) {
					GameGlobals.fightHelper.startFight();
				});
				$(scope + "#out-action-fight-close").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
				});
				$(scope + "#out-action-fight-continue").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
				});
				$(scope + "#out-action-fight-takeselected").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
				});
				$(scope + "#out-action-fight-takeall").click(function (e) {
					GameGlobals.fightHelper.endFight(true);
				});
				$(scope + "#out-action-fight-cancel").click(function (e) {
					GameGlobals.fightHelper.endFight(false);
					GameGlobals.playerActionFunctions.flee();
				});
				$(scope + "#incoming-caravan-popup-cancel").click(function (e) {
					uiFunctions.popupManager.closePopup("incoming-caravan-popup");
				});
				$(scope + " button[action='leave_camp']").click(function (e) {
					gameState.uiStatus.leaveCampItems = {};
					gameState.uiStatus.leaveCampRes = {};

					let selectedResVO = new ResourcesVO(storageTypes.RESULT);
					$.each($("#embark-resources tr"), function () {
						var resourceName = $(this).attr("id").split("-")[2];
						var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
						selectedResVO.setResource(resourceName, selectedVal, "leave_camp");
					});

					var selectedItems = {};
					$.each($("#embark-items tr"), function () {
						var itemID = $(this).attr("id").split("-")[2];
						var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
						selectedItems[itemID] = selectedVal;
					});

					GameGlobals.playerActionFunctions.updateCarriedItems(selectedItems);
					GameGlobals.resourcesHelper.moveResFromCampToBag(selectedResVO);
					GameGlobals.playerActionFunctions.leaveCamp();
				});

				// Buttons: Bag: Item details
				// some in UIOoutBagSystem
			},
			
			registerCustomButtonListeners: function (scope, btnClass, fn) {
				$.each($(scope + " button." + btnClass), function () {
					var $element = $(this);
					if ($element.hasClass("click-bound")) {
						log.w("trying to bind click twice! id: " + $element.attr("id"));
						return;
					}
					$element.addClass("click-bound");
					$element.click(ExceptionHandler.wrapClick(fn));
				});
			},
			
			updateButtonCooldowns: function (scope) {
				scope = scope || "";
				let updates = false;
				let sys = this;
				$.each($(scope + " button.action"), function () {
					var action = $(this).attr("action");
					if (action) {
						sys.updateButtonCooldown($(this), action);
						updates = true;
					}
				});
				return updates;
			},

			registerCollapsibleContainerListeners: function (scope) {
				var sys = this;
				$(scope + " .collapsible-header").click(function () {
					var wasVisible = $(this).next(".collapsible-content").is(":visible");
					sys.toggleCollapsibleContainer($(this), !wasVisible);
				});
				$.each($(scope + " .collapsible-header"), function () {
					sys.toggleCollapsibleContainer($(this), false);
				});
			},

			registerStepperListeners: function (scope) {
				var sys = this;
				$(scope + " .stepper button").click(function (e) {
					sys.onStepperButtonClicked(this, e);
				});
				$(scope + ' .stepper input.amount').change(function () {
					sys.onStepperInputChanged(this)
				});
				$(scope + " .stepper input.amount").focusin(function () {
					$(this).data('oldValue', $(this).val());
				});
				$(scope + ' .stepper input.amount').trigger("change");

				// All number inputs
				$(scope + " input.amount").keydown(this.onNumberInputKeyDown);
			},

			generateElements: function () {
				this.generateTabBubbles();
				this.generateResourceIndicators();
				this.generateSteppers("body");
				this.generateButtonOverlays("body");
				this.generateCallouts("body");
				this.setInitialButtonState("body");
			},
			
			hideElements: function () {
				this.toggle($(".hidden-by-default"), false);
			},

			generateTabBubbles: function () {
				$("#switch li").append("<div class='bubble' style='display:none'>1</div>");
			},

			generateResourceIndicators: function () {
				for (let key in resourceNames) {
					let name = resourceNames[key];
					$("#statsbar-resources-regular").append(UIConstants.createResourceIndicator(name, false, "resources-camp-regular-" + name, true, true, true, true));
					$("#statsbar-resources-mobile").append(UIConstants.createResourceIndicator(name, false, "resources-camp-mobile-" + name, true, true, true, false));
					$("#bag-resources-regular").append(UIConstants.createResourceIndicator(name, false, "resources-bag-regular-" + name, true, true, false, false));
					$("#bag-resources-mobile").append(UIConstants.createResourceIndicator(name, false, "resources-bag-mobile-" + name, true, true, false, false));
				}
			},

			generateCallouts: function (scope) {
				// Info callouts
				$.each($(scope + " .info-callout-target"), function () {
					let $target = $(this);
					let generated = $target.data("callout-generated") || $target.parent().hasClass("callout-container");
					if (generated) {
						log.w("Info callout already generated! id: " + $target.attr("id") + ", scope: " + scope);
						log.i($target);
						return;
					}
					
					let isSidePosition = $target.hasClass("info-callout-target-side")
					let arrowClass = isSidePosition ? "callout-arrow-left" : "callout-arrow-up";
					
					$target.wrap('<div class="callout-container"></div>');
					$target.after(function () {
						let description = $(this).attr("description");
						let content = description;
						content = '<div class="' + arrowClass + '"></div><div class="info-callout-content">' + content + "</div>";
						let callout = '<div class="info-callout">' + content + '</div>';
						return callout;
					});
					$target.data("callout-generated", true);
				});

				// Button callouts
				// TODO performance bottleneck - detach elements to edit
				var uiFunctions = this;
				$.each($(scope + " div.container-btn-action"), function () {
					let $container = $(this);
					let button = $(this).children("button")[0];
					let action = $(button).attr("action");
					let generated = $container.data("callout-generated");
					if (generated) {
						log.w("Button callout already generated!");
						log.i($container);
						return;
					}
					$container.data("callout-generated", true);
					$container.wrap('<div class="callout-container"></div>');
					$container.after(function () {
						if (!action) {
							log.w("Action button with no action ");
							log.i($(button))
							return "";
						}
						if (action === "take_all" || action === "accept_inventory" || action === "fight")
							return "";
						return uiFunctions.generateActionButtonCallout(action);
					});
				});

				GlobalSignals.calloutsGeneratedSignal.dispatch();
			},
			
			updateCallouts: function (scope) {
				$.each($(scope + " .callout-container"), function () {
					var description = $(this).children(".info-callout-target").attr("description");
					if (description && description.length > 0) {
						$(this).find(".info-callout-content").html(description);
					}
				});
			},
			
			generateActionButtonCallout: function (action) {
				var baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);

				var content = "";
				var enabledContent = "";
				var disabledContent = "";
				
				/*
				var ordinal = GameGlobals.playerActionsHelper.getActionOrdinal(action);
				content += "<span>" + action + " " + ordinal + "</span>"
				*/

				// always visible
				// - basic description
				let description = GameGlobals.playerActionsHelper.getDescription(action);
				if (description) {
					content += "<span class='action-description'>" + description + "</span>";
				}

				// - dynamic effect description
				content += "<div class='action-effect-description-container'>";
				if (content.length > 0) content += "<hr/>";
				content += "<span class='action-effect-description'></span>"
				content += "</div>";

				// visible if button is enabled: costs, special requirements, & risks
				// - costs
				let costs = GameGlobals.playerActionsHelper.getCosts(action);
				let costsSpans = UIConstants.getCostsSpans(action, costs);
				if (costsSpans.length > 0) {
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					enabledContent += costsSpans;
				}

				// - time to available
				if (GameGlobals.playerActionsHelper.isOnlyAccumulatingCosts(costs, true)) {
					enabledContent += "<div class='action-costs-countdown-container'>";
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					enabledContent += "<span class='action-costs-countdown'></span>";
					enabledContent += "</div>";
				}

				// - duration
				var duration = PlayerActionConstants.getDuration(action, baseActionId);
				if (duration > 0) {
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					enabledContent += "<span class='action-duration'>duration: " + Math.round(duration * 100) / 100 + "s</span>";
				}
				
				// - special requirements (such as max improvements on level)
				let specialReqs = GameGlobals.playerActionsHelper.getSpecialReqs(action);
				if (specialReqs) {
					let s = this.getSpecialReqsText(action);
					if (s.length > 0) {
						if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
						enabledContent += "<span class='action-special-reqs'>" + s + "</span>";
					}
				}

				// - risks
				var encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);
				var injuryRiskMax = PlayerActionConstants.getInjuryProbability(action, 0, 0);
				var inventoryRiskMax = PlayerActionConstants.getLoseInventoryProbability(action, 0, 0);
				var fightRiskMax = PlayerActionConstants.getRandomEncounterProbability(baseActionId, 0, 1, encounterFactor);
				var fightRiskMin = PlayerActionConstants.getRandomEncounterProbability(baseActionId, 100, 1, encounterFactor);
				if (injuryRiskMax > 0 || inventoryRiskMax > 0 || fightRiskMax > 0) {
					if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
					var inventoryRiskLabel = action === "despair" ? "drop items" : "drop item";
					if (injuryRiskMax > 0)
						enabledContent += "<span class='action-risk action-risk-injury warning'>injury: <span class='action-risk-value'></span>%</span>";
					if (inventoryRiskMax > 0)
						enabledContent += "<span class='action-risk action-risk-inventory warning'>" + inventoryRiskLabel + ": <span class='action-risk-value'></span>%</span>";
					if (fightRiskMax > 0)
						enabledContent += "<span class='action-risk action-risk-fight warning'>fight: <span class='action-risk-value'></span>%</span>";
				}

				// visible if button is disabled: disabled reason
				if (content.length > 0 || enabledContent.length > 0) {
					if (content.length > 0) disabledContent += "<hr/>";
					disabledContent += "<span class='btn-disabled-reason action-cost-blocker'></span>";
				}

				if (enabledContent.length > 0) {
					content += "<span class='btn-callout-content-enabled'>" + enabledContent + "</span>";
				}

				if (disabledContent.length > 0) {
					content += "<span class='btn-callout-content-disabled' style='display:none'>" + disabledContent + "</span>";
				}

				if (content.length > 0) {
					return '<div class="btn-callout"><div class="callout-arrow-up"></div><div class="btn-callout-content">' + content + '</div></div>';
				} else {
					log.w("No callout could be created for action button with action " + action + ". No content for callout.");
					return "";
				}
			},

			getSpecialReqsText: function (action) {
				var position = GameGlobals.playerActionFunctions.playerPositionNodes.head ? GameGlobals.playerActionFunctions.playerPositionNodes.head.position : {};
				let s = "";
				let specialReqs = GameGlobals.playerActionsHelper.getSpecialReqs(action);
				if (specialReqs) {
					for (let key in specialReqs) {
						switch (key) {
							case "improvementsOnLevel":
								let actionImprovementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(action);
								if (actionImprovementName != improvementNames.camp) {
									for (let improvementID in specialReqs[key]) {
										let range = specialReqs[key][improvementID];
										let count = GameGlobals.playerActionsHelper.getCurrentImprovementCountOnLevel(position.level, improvementID);
										let rangeText = UIConstants.getRangeText(range);
										let displayName = GameGlobals.playerActionsHelper.getImprovementDisplayName(improvementID);
										if (actionImprovementName == displayName) {
											displayName = "";
										}
										s += rangeText + " " + displayName + " on level (" + count + ")";
									}
								}
								break;
							default:
								s += key + ": " + specialReqs[key];
								log.w("unknown special req: " + key);
								break;
						}
					}
				}
				s.trim();
				return s;
			},

			generateSteppers: function (scope) {
				$(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='minus' data-field=''>-</button>");
				$(scope + " .stepper").append("<input class='amount' type='text' min='0' max='100' autocomplete='off' value='0' name='' tabindex='1'></input>");
				$(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='plus' data-field=''>+</button>");
				$(scope + " .stepper button").attr("data-field", function (i, val) {
					return $(this).parent().attr("id") + "-input";
				});
				$(scope + " .stepper button").attr("action", function (i, val) {
					return $(this).parent().attr("id") + "-" + $(this).attr("data-type");
				});
				$(scope + " .stepper input").attr("name", function (i, val) {
					return $(this).parent().attr("id") + "-input";
				});
			},

			generateButtonOverlays: function (scope) {
				$.each($(scope + " button.action"), function () {
					let $btn = $(this);
					if ($btn.parent().hasClass("container-btn-action")) {
						log.w("generating double button overlays: " + $(this) + " | " + scope);
						return;
					}
					let action = $btn.attr("action");
					let hotkey = GameGlobals.uiFunctions.getActionHotkey(action);
					let text = $btn.text();
					$btn.text("");
					$btn.append("<span class='btn-label'>" + text + "</span>");
					$btn.append("<div class='cooldown-action' style='display:none' />");
					$btn.append("<div class='cooldown-duration' style='display:none' />");
					if (hotkey) {
						$btn.append("<div class='hotkey-hint hide-in-small-layout'>" + hotkey.displayKeyShort + "</div>");
					}
					$btn.wrap("<div class='container-btn-action' />");
				});
				
				
				$.each($(scope + " div.container-btn-action"), function () {
					let $container = $(this);
					if ($container.find(".cooldown-reqs").length > 0) return;
					let $button = $container.find("button");
					let action = $button.attr("action");
					let costs = GameGlobals.playerActionsHelper.getCosts(action);
					let hasCosts = action && costs && Object.keys(costs).length > 0;
					if (hasCosts) {
						$container.append("<div class='cooldown-reqs' data-action='" + action + "' />");
					}
				});

				this.updateHotkeyHints();
			},

			updateHotkeyHints: function () {
				let hotkeysEnabled = GameGlobals.gameState.settings.hotkeysEnabled;
				$(".hotkey-hint").toggleClass("hidden", !hotkeysEnabled);

				if (!hotkeysEnabled) return;

				$.each($("button.action"), function () {
					let $btn = $(this);
					let action = $btn.attr("action");
					let hotkey = GameGlobals.uiFunctions.getActionHotkey(action);
					$btn.children(".hotkey-hint").html(hotkey ? hotkey.displayKeyShort : "");
				});
			},
			
			setInitialButtonState: function (scope) {
				GameGlobals.buttonHelper.updateButtonDisabledStates(scope, true);
			},

			startGame: function () {
				log.i("Starting game..");
				var startTab = this.elementIDs.tabs.out;
				var playerPos = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
				if (playerPos.inCamp) startTab = this.elementIDs.tabs.in;
				this.selectTab(startTab);
			},

			/**
			 * Resets cooldown for an action. Should be called directly after an action is completed and any relevant popup is closed.
			 * @param {type} action action
			 */
			completeAction: function (action) {
				let baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
				let cooldown = PlayerActionConstants.getCooldown(baseId);
				if (cooldown > 0) {
					let locationKey = this.getLocationKey(action);
					GameGlobals.gameState.setActionCooldown(action, locationKey, cooldown);
					if (!GameGlobals.gameState.isAutoPlaying) {
						let button = $("button[action='" + action + "']");
						this.startButtonCooldown($(button), cooldown);
					}
				}
			},

			showGame: function () {
				this.hideGameCounter = this.hideGameCounter || 1;
				this.hideGameCounter--;
				if (this.hideGameCounter > 0) return;
				log.i("[ui] show game ");
				this.setGameOverlay(false, false);
				this.setGameElementsVisibility(true);
				this.updateButtonCooldowns();
				this.setUIStatus(false, false);

				setTimeout(function () {
					GlobalSignals.gameShownSignal.dispatch();
				}, 1);
			},

			hideGame: function (showLoading, showThinking) {
				this.hideGameCounter = this.hideGameCounter || 0;
				this.hideGameCounter++;
				log.i("[ui] hide game (showLoading: " + showLoading + ", showThinking: " + showThinking + ")");
				showThinking = showThinking && !showLoading;
				this.setGameOverlay(showLoading, showThinking);
				this.setGameElementsVisibility(showThinking);
				this.setUIStatus(true, true);
			},
			
			blockGame: function () {
				this.setUIStatus(GameGlobals.gameState.uiStatus.isHidden, true);
			},
			
			unblockGame: function () {
				this.setUIStatus(GameGlobals.gameState.uiStatus.isHidden, false);
			},
			
			setUIStatus: function (isHidden, isBlocked) {
				isBlocked = isBlocked || isHidden;
				GameGlobals.gameState.uiStatus.isHidden = isHidden;
				GameGlobals.gameState.uiStatus.isBlocked = isBlocked;
			},
			
			setGameOverlay: function (isLoading, isThinking) {
				isThinking = isThinking && !isLoading;
				$(".loading-content").css("display", isLoading ? "block" : "none");
				$(".thinking-content").css("display", isThinking ? "block" : "none");
			},
			
			setGameElementsVisibility: function (visible) {
				$(".sticky-footer").css("display", visible ? "block" : "none");
				$("#grid-main").css("display", visible ? "block" : "none");
				$("#unit-main").css("display", visible ? "block" : "none");
				$(".hide-while-loading").css("display", visible ? "initial" : "none");
			},

			scrollToTabTop: function () {
				let element = $(document.getElementById("grid-location-header"));
				let elementTop = element.offset().top;
			    let offset = elementTop - $(window).scrollTop();

			    if (offset < 0) {
			        $('html,body').animate({scrollTop: elementTop}, 250);
			    }
			},

			restart: function () {
				$("#log ul").empty();
				this.onTabClicked(this.elementIDs.tabs.out);
				GlobalSignals.restartGameSignal.dispatch(true);
			},

			onResize: function () {
				GlobalSignals.windowResizedSignal.dispatch();
			},

			updateGameStatsPopup: function () {
				let html = "";
				let stats = GameGlobals.playerHelper.getVisibleGameStats();
				for (let i in stats) {
					let category = stats[i];
					let isCategoryDebugVisible = !category.isVisible && GameConstants.isDebugVersion;
					let isCategoryVisible = category.isVisible || isCategoryDebugVisible;
					if (!isCategoryVisible) continue;
					html += "<div class='game-stat-category" + (isCategoryDebugVisible ? " debug-info" : "") + "'>";
					html += "<h4>" + category.displayName + "</h4>";
					for (let j in category.stats) {
						let stat = category.stats[j];

						let isDebugVisible = !stat.isVisible && GameConstants.isDebugVersion;
						let isVisible = stat.isVisible || isDebugVisible;
						if (!isVisible) continue;

						let divClasses = [ "game-stat-entry" ];
						if (isDebugVisible) divClasses.push("debug-info");
						if (stat.isInSubCategory) divClasses.push("game-stat-in-subcategory")

						if (stat.isSubCategory) {
							divClasses.push("game-stat-sub-category");
							html += "<div class='" + divClasses.join(" ") + "'>" + stat.displayName + "</div>";
							continue;
						}

						let displayValue = "-";
						if (stat.value) {
							if (stat.unit == GameConstants.gameStatUnits.seconds) {
								displayValue = UIConstants.getTimeToNum(stat.value)
							} else if (stat.isPercentage) {
								displayValue = UIConstants.roundValue(stat.value * 100) + "%";
							} else if (stat.unit == GameConstants.gameStatUnits.steps) {
								displayValue = UIConstants.roundValue(stat.value) + " steps";
							} else {
								displayValue = UIConstants.roundValue(stat.value);
							}
						}
						html += "<div class='" + divClasses.join(" ") + "'>";
						html += "<span class='game-stat-span game-stat-name'>" + stat.displayName + "</span>";
						html += "<span class='game-stat-span game-stat-value'>" + displayValue + "</span>";
						if (stat.entry) {
							let entryDisplay = stat.entry;
							if (stat.entry.hasOwnProperty("sectorX")) {
								entryDisplay = new PositionVO(stat.entry.level, stat.entry.sectorX, stat.entry.sectorY).getInGameFormat(true);
							} else if (stat.entry.hasOwnProperty("name")) {
								entryDisplay = stat.entry.name;
							} else if (EnemyConstants.getEnemy(stat.entry)) {
								entryDisplay = EnemyConstants.getEnemy(stat.entry).name;
							} else if(ItemConstants.getItemByID(stat.entry, true)) {
								entryDisplay = ItemConstants.getItemByID(stat.entry).name;
							} else if (stat.entry.hasOwnProperty("timestamp")) {
								entryDisplay = UIConstants.getTimeSinceText(stat.entry.timestamp);
							}
							html += "<span class='game-stat-span game-stat-entry'>(" + entryDisplay + ")</span>";
						}
						html += "</div>";
					}
					html += "</div>";
				}
				
				$("#game-stats-container").html(html);
			},

			getGameInfoDiv: function () {
				let html = "";
				html += "<span id='changelog-version'>version " + GameGlobals.changeLogHelper.getCurrentVersionNumber() + "<br/>updated " + GameGlobals.changeLogHelper.getCurrentVersionDate() + "</span>";
				html += "<p>Note that this game is still in development and many features are incomplete and unbalanced. Updates might break saves. Feedback and bug reports are appreciated!</p>";
				html += "<p>Feedback:<br/>" + GameConstants.getFeedbackLinksHTML() + "</p>";
				html += "<p>More info:<br/><a href='faq.html' target='faq'>faq</a> | <a href='changelog.html' target='changelog'>changelog</a></p>";
				return html;
			},

			onTabClicked: function (tabID, tabProps) {
				if (GameGlobals.gameState.isLaunchStarted) return;
				if (GameGlobals.gameState.isLaunched) return;

				let inCamp = GameGlobals.playerHelper.isInCamp();
				if (inCamp && tabID == GameGlobals.uiFunctions.elementIDs.tabs.out) tabID == GameGlobals.uiFunctions.elementIDs.tabs.embark;
				
				GameGlobals.uiFunctions.selectTab(tabID, tabProps);
			},
			
			selectTab: function (tabID, tabProps) {

				$("#switch-tabs li").removeClass("selected");
				$("#switch-tabs li#" + tabID).addClass("selected");
				$("#tab-header h2").text(tabID);

				gtag('event', 'screen_view', {
					'screen_name': tabID
				});

				var transition = !(GameGlobals.gameState.uiStatus.currentTab === tabID);
				var transitionTime = transition ? 200 : 0;
				GameGlobals.gameState.uiStatus.currentTab = tabID;

				$.each($(".tabelement"), function () {
					GameGlobals.uiFunctions.slideToggleIf($(this), null, $(this).attr("data-tab") === tabID, transitionTime, 200);
				});
				$.each($(".tabbutton"), function () {
					GameGlobals.uiFunctions.slideToggleIf($(this), null, $(this).attr("data-tab") === tabID, transitionTime, 200);
				});
				
				log.i("tabChanged: " + tabID, "ui");

				GlobalSignals.tabChangedSignal.dispatch(tabID, tabProps);
			},

			onStepperButtonClicked: function (button, e) {
				e.preventDefault();
				var fieldName = $(button).attr('data-field');
				var type = $(button).attr('data-type');
				var input = $("input[name='" + fieldName + "']");
				var currentVal = parseInt(input.val());
				if (!isNaN(currentVal)) {
					if (type == 'minus') {
						var min = input.attr('min');
						if (currentVal > min) {
							input.val(currentVal - 1).change();
						}
					} else if (type == 'plus') {
						var max = input.attr('max');
						if (currentVal < max) {
							input.val(currentVal + 1).change();
						}
					}
				} else {
					log.w("invalid stepper input value [" + fieldName + "]");
					input.val(0);
				}
			},

			onStepperInputChanged: function (input) {
				var minValue = parseInt($(input).attr('min'));
				var maxValue = parseInt($(input).attr('max'));
				var valueCurrent = parseInt($(input).val());
				var name = $(input).attr('name');

				if (isNaN(valueCurrent)) {
					let valueOld = $(this).data('oldValue');
					if (!isNaN(valueOld)) {
						$(this).val(valueOld);
						return;
					} else {
						$(this).val(0);
					}
				}

				this.updateStepperButtons("#" + $(input).parent().attr("id"));
			},
			
			onKeyUp: function (e) {
				if (e.originalEvent.isTextInput) return;
				if (!GameGlobals.uiFunctions.triggerHotkey(e.originalEvent.code, e)) return;
			},

			triggerHotkey: function (code, modifiers) {
				if (!this.hotkeys[code]) return false;
				let currentTab = GameGlobals.gameState.uiStatus.currentTab;
				let hasPopups = GameGlobals.uiFunctions.popupManager.hasOpenPopup();

				for (let i = 0; i < this.hotkeys[code].length; i++) {
					let hotkey = this.hotkeys[code][i];
					if (hotkey.tab && hotkey.tab !== currentTab) continue;
					if (!hotkey.isUniversal && hasPopups) continue;
					if (hotkey.activeCondition && !hotkey.activeCondition()) continue;
					if (!GameGlobals.gameState.settings.hotkeysEnabled && !hotkey.isUniversal) continue;

					let modifier = GameGlobals.uiFunctions.getActualHotkeyModifier(hotkey.modifier);
					if (modifier && !modifiers[modifier]) continue;

					log.i("[hotkey] triggered " + hotkey.code + " " + hotkey.modifier + " " + hotkey.tab);

					hotkey.cb.apply(this);
					return true;
				}

				return false;
			},

			getActualHotkeyModifier: function (modifier) {
				if (!modifier) return null;

				let result = modifier.modifier || modifier;
				if (result == GameGlobals.uiFunctions.HOTKEY_DEFAULT_MODIFIER) {
					result = null;
				}
				return result;
			},

			onNumberInputKeyDown: function (e) {
				// Allow: backspace, delete, tab, escape, enter and .
				if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 190]) !== -1 ||
					// Allow: Ctrl+A
					(e.keyCode == 65 && e.ctrlKey === true) ||
					// Allow: home, end, left, right
					(e.keyCode >= 35 && e.keyCode <= 39)) {
					return;
				}
				// Ensure that it's a number and stop the keypress
				if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
					e.preventDefault();
				}
			},

			onTextInputKeyDown: function (e) {
				// Allow: backspace, delete, tab, escape and enter
				if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
					// Allow: Ctrl+A
					(e.keyCode == 65 && e.ctrlKey === true) ||
					// Allow: home, end, left, right
					(e.keyCode >= 35 && e.keyCode <= 39)) {
					// let it happen, don't do anything
					return;
				}
				e.originalEvent.isTextInput = true;
			},

			onTextInputKeyUp: function (e) {
				let value = $(e.target).val();
				value = StringUtils.cleanUpInput(value, $(e.target).data("max-input-length"), '_');
				$(e.target).val(value);
				e.originalEvent.isTextInput = true;
			},

			onPlayerPositionChanged: function () {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				var updates = false;
				updates = this.updateButtonCooldowns("") || updates;
				if (updates) {
					GlobalSignals.updateButtonsSignal.dispatch();
				}
			},
			
			onRestartButton: function () {
				var sys = this;
				this.showConfirmation(
					"Do you want to restart the game? Your progress will be lost.",
					function () {
						sys.restart();
					},
					true
				);
			},

			slideToggleIf: function (element, replacement, show, durationIn, durationOut, cb) {
				var visible = this.isElementToggled(element);
				var toggling = ($(element).attr("data-toggling") == "true");
				var sys = this;

				if (show && (visible == false || visible == null) && !toggling) {
					if (replacement) sys.toggle(replacement, false);
					$(element).attr("data-toggling", "true");
					$(element).stop().slideToggle(durationIn, function () {
						sys.toggle(element, true);
						$(element).attr("data-toggling", "false");
						if (cb) cb();
					});
				} else if (!show && (visible == true || visible == null) && !toggling) {
					$(element).attr("data-toggling", "true");
					$(element).stop().slideToggle(durationOut, function () {
						if (replacement) sys.toggle(replacement, true);
						sys.toggle(element, false);
						$(element).attr("data-toggling", "false");
						if (cb) cb();
					});
				}
			},

			toggleCollapsibleContainer: function (element, show) {
				var $element = typeof (element) === "string" ? $(element) : element;
				if (show) {
					var group = $element.parents(".collapsible-container-group");
					if (group.length > 0) {
						var sys = this;
						$.each($(group).find(".collapsible-header"), function () {
							var $child = $(this);
							if ($child[0] !== $element[0]) {
								sys.toggleCollapsibleContainer($child, false);
							}
						});
					}
				}
				$element.toggleClass("collapsible-collapsed", !show);
				$element.toggleClass("collapsible-open", show);
				this.slideToggleIf($element.next(".collapsible-content"), null, show, 300, 200);
				GlobalSignals.elementToggledSignal.dispatch($element, show);
			},

			tabToggleIf: function (element, replacement, show, durationIn, durationOut) {
				var visible = $(element).is(":visible");
				var toggling = ($(element).attr("data-toggling") == "true");
				var sys = this;

				if (show && !visible && !toggling) {
					if (replacement) sys.toggle(replacement, false);
					$(element).attr("data-toggling", "true");
					$(element).fadeToggle(durationIn, function () {
						sys.toggle(element, true);
						$(element).attr("data-toggling", "false");
					});
				} else if (!show && visible && !toggling) {
					$(element).attr("data-toggling", "true");
					$(element).fadeToggle(durationOut, function () {
						if (replacement) sys.toggle(replacement, true);
						sys.toggle(element, false);
						$(element).attr("data-toggling", "false");
					});
				}
			},

			toggle: function (element, show, signalParams, delay) {
				let $element = typeof (element) === "string" ? $(element) : element;
				if (($element).length === 0)
					return;
				if (typeof (show) === "undefined")
					show = false;
				if (show === null)
					show = false;
				if (!show)
					show = false;
				if (this.isElementToggled($element) === show)
					return;
					
				this.cancelDelayedToggle($element);
				
				if (!delay || delay <= 0) {
					this.toggleInternal($element, show, signalParams);
				} else {
					let id = setTimeout(function () { GameGlobals.uiFunctions.toggleInternal($element, show, signalParams); }, delay);
					$element.attr("data-toggle-timeout", id);
				}
			},
			
			toggleInternal: function ($element, show, signalParams) {
				$element.attr("data-visible", show);
				$element.toggle(show);
				// NOTE: For some reason the element isn't immediately :visible for checks in UIOutElementsSystem without the timeout
				setTimeout(function () {
					GlobalSignals.elementToggledSignal.dispatch($element, show, signalParams);
				}, 1);
			},
			
			cancelDelayedToggle: function ($element) {
				// TOGO generalize for cancelling any timeout with id like "toggle-timeout"
				let id = $element.attr("data-toggle-timeout");
				if (!id) return;
				clearTimeout(id);
				$element.attr("data-toggle-timeout", 0);
			},
			
			toggleContainer: function (element, show, signalParams) {
				var $element = typeof (element) === "string" ? $(element) : element;
				this.toggle($element, show, signalParams);
				this.toggle($element.children("button"), show, signalParams);
			},

			isElementToggled: function (element) {
				var $element = typeof (element) === "string" ? $(element) : element;
				if (!$element || ($element).length === 0)
					return false;

				// if several elements, return their value if all agree, otherwise null
				if (($element).length > 1) {
					var previousIsToggled = null;
					var currentIsToggled = null;
					for (let i = 0; i < ($element).length; i++) {
						previousIsToggled = currentIsToggled;
						currentIsToggled = this.isElementToggled($(($element)[i]));
						if (i > 0 && previousIsToggled !== currentIsToggled) return null;
					}
					return currentIsToggled;
				}

				var visible = true;
				var visibletag = ($element.attr("data-visible"));

				if (typeof visibletag !== typeof undefined) {
					visible = (visibletag == "true");
				} else {
					visible = null;
				}
				return visible;
			},

			isElementVisible: function (element, skipParentsCheck) {
				var $element = typeof (element) === "string" ? $(element) : element;
				var toggled = this.isElementToggled($element);
				if (toggled === false)
					return false;
				if (!skipParentsCheck) {
					var $e = $element.parent();
					while ($e && $e.length > 0) {
						if (!$e.hasClass("collapsible-content") && !$e.hasClass("callout-container")) {
							var parentToggled = this.isElementToggled($e);
							if (parentToggled === false) {
								return false;
							}
						}
						$e = $e.parent();
					}
				}
				return (($element).is(":visible"));
			},

			stopButtonCooldown: function (button) {
				$(button).children(".cooldown-action").stop(true, true);
				$(button).attr("data-hasCooldown", "false");
				$(button).children(".cooldown-action").css("display", "none");
				$(button).children(".cooldown-action").css("width", "100%");
				GlobalSignals.updateButtonsSignal.dispatch();
			},
			
			updateButtonCooldown: function (button, action) {
				var baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
				var locationKey = this.getLocationKey(action);
				cooldownTotal = PlayerActionConstants.getCooldown(baseId);
				cooldownLeft = Math.min(cooldownTotal, GameGlobals.gameState.getActionCooldown(action, locationKey, cooldownTotal));
				durationTotal = PlayerActionConstants.getDuration(action, baseId);
				durationLeft = Math.min(durationTotal, GameGlobals.gameState.getActionDuration(action, locationKey, durationTotal));
				if (cooldownLeft > 0) this.startButtonCooldown(button, cooldownTotal, cooldownLeft);
				else this.stopButtonCooldown(button);
				if (durationLeft > 0) this.startButtonDuration(button, durationTotal, durationLeft);
				else this.stopButtonDuration(button);
			},

			startButtonCooldown: function (button, cooldown, cooldownLeft) {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				let action = $(button).attr("action");
				if (!GameGlobals.playerActionsHelper.isRequirementsMet(action)) return;
				if (!cooldownLeft) cooldownLeft = cooldown;
				var uiFunctions = this;
				var startingWidth = (cooldownLeft / cooldown * 100);
				$(button).attr("data-hasCooldown", "true");
				$(button).children(".cooldown-action").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate({
						width: 0
					},
					cooldownLeft * 1000,
					'linear',
					function () {
						uiFunctions.stopButtonCooldown($(this).parent());
					}
				);
			},

			stopButtonDuration: function (button) {
				$(button).children(".cooldown-duration").stop(true, true);
				$(button).children(".cooldown-duration").css("display", "none");
				$(button).children(".cooldown-duration").css("width", "0%");
				$(button).attr("data-isInProgress", "false");
			},

			startButtonDuration: function (button, duration, durationLeft) {
				if (!durationLeft) durationLeft = duration;
				let uiFunctions = this;
				let startingWidth = (1 - durationLeft / duration) * 100;
				$(button).attr("data-isInProgress", "true");
				$(button).children(".cooldown-duration").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate({
						width: '100%'
					},
					durationLeft * 1000,
					'linear',
					function () {
						uiFunctions.stopButtonDuration($(this).parent());
					}
				);
			},

			getLocationKey: function (action) {
				var isLocationAction = PlayerActionConstants.isLocationAction(action);
				var playerPos = GameGlobals.playerActionFunctions.playerPositionNodes.head.position;
				return GameGlobals.gameState.getActionLocationKey(isLocationAction, playerPos);
			},
			
			updateCostsSpans: function (action, costs, elements, costsStatus, displayedCosts, signalParams) {
				let playerHealth = GameGlobals.playerActionFunctions.playerStatsNodes.head.stamina.health;
				let maxRumours = GameGlobals.playerActionFunctions.playerStatsNodes.head.rumours.maxValue;
				let maxEvidence = GameGlobals.playerActionFunctions.playerStatsNodes.head.evidence.maxValue;
				let maxFavour = GameGlobals.playerHelper.getMaxFavour();
				let maxInsight = GameGlobals.playerActionFunctions.playerStatsNodes.head.insight.maxValue;
				let showStorage = GameGlobals.resourcesHelper.getCurrentStorageCap();

				let maxCostCountdown = -1;
				let hasNonAccumulatingCost = false;
				
				// costs themselves
				for (let key in costs) {
					let value = costs[key];
					let isAccumulatingCost = GameGlobals.playerActionsHelper.isAccumulatingCost(key, false);

					if (isAccumulatingCost && !hasNonAccumulatingCost) {
						let costCountdown = GameGlobals.playerActionsHelper.getCostCountdownSeconds(key, value);
						if (costCountdown >= 0 && costCountdown > maxCostCountdown) {
							maxCostCountdown = costCountdown;
						}
					} else {
						hasNonAccumulatingCost = true;
					}

					let $costSpan = elements.costSpans[key];
					if (!$costSpan || $costSpan.length == 0) {
						log.w("cost span missing: " + key + " " + action);
						continue;
					}
					let costFraction = GameGlobals.playerActionsHelper.checkCost(action, key);
					let isFullCostBlocker =
						(isResource(key.split("_")[1]) && value > showStorage) ||
						(key == "stamina" && value > playerHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR) ||
						(key == "rumours" && value > maxRumours) ||
						(key == "evidence" && value > maxEvidence) ||
						(key == "insight" && value > maxInsight) ||
						(key == "favour" && value > maxFavour);
						
					if (costsStatus) {
						if (isFullCostBlocker) {
							costsStatus.hasCostBlockers = true;
						} else if (costFraction < costsStatus.bottleneckCostFraction) {
							costsStatus.bottleneckCostFraction = costFraction;
						}
					}
					$costSpan.toggleClass("action-cost-blocker", costFraction < 1);
					$costSpan.toggleClass("action-cost-blocker-storage", isFullCostBlocker);
	
					if (value !== displayedCosts[key]) {
						let $costSpanValue = elements.costSpanValues[key];
						$costSpanValue.html(UIConstants.getDisplayValue(value));
						GameGlobals.uiFunctions.toggle($costSpan, value > 0, signalParams);
						displayedCosts[key] = value;
					}
				}

				// cost countdown
				let $costsCountdown = elements.calloutCostsCountdown;
				let $costsCountdownContainer = elements.calloutCostsCountdownContainer;
				let showCostCountdown = !hasNonAccumulatingCost && maxCostCountdown >= 0 && costsStatus.bottleneckCostFraction < 1;
				GameGlobals.uiFunctions.toggle($costsCountdownContainer, showCostCountdown, signalParams);
				if (showCostCountdown) {
					$costsCountdown.text("Available in: " + UIConstants.getTimeToNum(maxCostCountdown));
				}
			},

			updateStepper: function (id, val, min, max) {
				var $input = $(id + " input");
				var oldVal = parseInt($input.val());
				var oldMin = parseInt($input.attr('min'));
				var oldMax = parseInt($input.attr('max'));
				if (oldVal === val && oldMin === min && oldMax === max) return;
				$input.attr("min", min);
				$input.attr("max", max);
				$input.val(val)
				this.updateStepperButtons(id);
			},

			updateStepperButtons: function (id) {
				var $input = $(id + " input");
				var name = $input.attr('name');
				var minValue = parseInt($input.attr('min'));
				var maxValue = parseInt($input.attr('max'));
				var valueCurrent = MathUtils.clamp(parseInt($input.val()), minValue, maxValue);

				var decEnabled = false;
				var incEnabled = false;
				if (valueCurrent > minValue) {
					decEnabled = true;
				} else {
					$input.val(minValue);
					
				}
				if (valueCurrent < maxValue) {
					incEnabled = true;
				} else {
					$input.val(maxValue);
				}

				var decBtn = $(".btn-glyph[data-type='minus'][data-field='" + name + "']");
				decBtn.toggleClass("btn-disabled", !decEnabled);
				decBtn.toggleClass("btn-disabled-basic", !decEnabled);
				decBtn.attr("disabled", !decEnabled);
				var incBtn = $(".btn-glyph[data-type='plus'][data-field='" + name + "']");
				incBtn.toggleClass("btn-disabled", !incEnabled);
				incBtn.toggleClass("btn-disabled-basic", !incEnabled);
				incBtn.attr("disabled", !incEnabled);
			},
			
			updateBubble: function (element, oldBubbleNumber, bubbleNumber) {
				bubbleNumber = bubbleNumber || 0;
				if (GameGlobals.gameState.isLaunchStarted) bubbleNumber = 0;
				
				if (bubbleNumber == oldBubbleNumber) return;
				
				var $element = typeof (element) === "string" ? $(element) : element;
				
				$element.text(bubbleNumber);
				GameGlobals.uiFunctions.toggle($element, bubbleNumber > 0);
			},

			registerLongTap: function (element, callback) {
				var $element = typeof (element) === "string" ? $(element) : element;
				var minTime = 1000;
				var intervalTime = 200;

				var cancelLongTap = function () {
					mouseDown = false;
					var timer = $(this).attr("data-long-tap-timeout");
					var interval = $(this).attr("data-long-tap-interval");
					if (!timer && !interval) return;
					clearTimeout(timer);
					clearInterval(interval);
					$(this).attr("data-long-tap-interval", 0);
					$(this).attr("data-long-tap-timeout", 0);
				};
				$element.on('mousedown', function (e) {
					var target = e.target;
					var $target = $(this);
					cancelLongTap()
					var timer = setTimeout(function () {
						cancelLongTap()
						var interval = setInterval(function () {
							if (GameGlobals.gameState.uiStatus.mouseDown && GameGlobals.gameState.uiStatus.mouseDownElement == target) {
								callback.apply($target, e);
							} else {
								cancelLongTap();
							}
						}, intervalTime);
						$(this).attr("data-long-tap-interval", interval);
					}, minTime);
					$(this).attr("data-long-tap-timeout", timer);
				});
				$element.on('mouseleave', function (e) {
					cancelLongTap();
				});
				$element.on('mousemove', function (e) {
					cancelLongTap();
				});
				$element.on('mouseout', function (e) {
					cancelLongTap();
				});
				$element.on('mouseup', function (e) {
					cancelLongTap();
				});
			},

			showTab: function (tabID, tabProps) {
				if (GameGlobals.gameState.isLaunched) return;
				this.onTabClicked(tabID, tabProps);
			},

			showPreviousTab: function () {
				let visibleTabElements = $("#switch-tabs li").filter("[data-visible=true]");
				let currentTabElement = $("#switch-tabs li.selected")[0];
				let currentTabElementIndex = visibleTabElements.toArray().indexOf(currentTabElement);
				let previousTabElementIndex = currentTabElementIndex - 1;
				if (previousTabElementIndex < 0) previousTabElementIndex = visibleTabElements.length - 1;
				visibleTabElements[previousTabElementIndex].click();
				GameGlobals.uiFunctions.scrollToTabTop();
			},

			showNextTab: function () {
				let visibleTabElements = $("#switch-tabs li").filter("[data-visible=true]");
				let currentTabElement = $("#switch-tabs li.selected")[0];
				let currentTabElementIndex = visibleTabElements.toArray().indexOf(currentTabElement);
				let nextTabElementIndex = currentTabElementIndex + 1;
				if (nextTabElementIndex >= visibleTabElements.length) nextTabElementIndex = 0;
				visibleTabElements[nextTabElementIndex].click();
				GameGlobals.uiFunctions.scrollToTabTop();
			},

			showFight: function () {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				this.showSpecialPopup("fight-popup");
			},

			showIncomingCaravanPopup: function () {
				this.showSpecialPopup("incoming-caravan-popup");
			},

			showManageSave: function () {
				let options = { isMeta: true, isDismissable: true };
				this.showSpecialPopup("manage-save-popup", options);
			},

			showSpecialPopup: function (popupID, options) {
				log.i("[ui] showSpecialPopup " + popupID);
				let $popup = $("#" + popupID);
				if ($popup.is(":visible")) return;
				
				if ($popup.parent().hasClass("popup-overlay")) $popup.unwrap();
				$popup.wrap("<div class='popup-overlay popup-overlay-ingame' style='display:none'></div>");

				GameGlobals.uiFunctions.popupManager.setDismissable($popup, options.isDismissable);
				
				let uiFunctions = this;
				$(".popup-overlay").fadeIn(200, function () {
					uiFunctions.popupManager.repositionPopups();
					GlobalSignals.popupOpenedSignal.dispatch(popupID);
					GameGlobals.gameState.isPaused = true;
					$("#" + popupID).fadeIn(200, function () {
						uiFunctions.toggle("#" + popupID, true);
						uiFunctions.popupManager.repositionPopups();
					});
					GlobalSignals.elementToggledSignal.dispatch(("#" + popupID), true);
				});
				this.generateCallouts("#" + popupID);
			},

			showInfoPopup: function (title, msg, buttonLabel, resultVO, callback, isMeta, isDismissable) {
				if (!buttonLabel) buttonLabel = "Continue";
				let options = {
					isMeta: isMeta,
					isDismissable: isDismissable,
				};
				this.popupManager.showPopup(title, msg, buttonLabel, false, resultVO, callback, null, options);
			},

			showResultPopup: function (title, msg, resultVO, callback, options) {
				this.popupManager.showPopup(title, msg, "Continue", false, resultVO, callback, null, options);
			},

			showConfirmation: function (msg, callback, isMeta) {
				let uiFunctions = this;
				
				let okCallback = function (e) {
					uiFunctions.popupManager.closePopup("common-popup");
					callback();
				};
				let cancelCallback = function () {
					uiFunctions.popupManager.closePopup("common-popup");
				};
				let options = {
					isMeta: isMeta,
					isDismissable: false,
				};
				
				this.popupManager.showPopup("Confirmation", msg, "Confirm", "Cancel", null, okCallback, cancelCallback, options);
			},

			showQuestionPopup: function (title, msg, buttonLabel, cancelButtonLabel, callbackOK, callbackNo, isMeta) {
				let uiFunctions = this;
				let okCallback = function (e) {
					uiFunctions.popupManager.closePopup("common-popup");
					callbackOK();
				};
				let cancelCallback = function () {
					uiFunctions.popupManager.closePopup("common-popup");
					if (callbackNo) callbackNo();
				};
				let options = {
					isMeta: isMeta,
					isDismissable: false,
				};
				this.popupManager.showPopup(title, msg, buttonLabel, cancelButtonLabel, null, okCallback, cancelCallback, options);
			},

			showInput: function (title, msg, defaultValue, allowCancel, confirmCallback, inputCallback, maxLength) {
				// TODO improve input validation (check and show feedback on input, not just on confirm)
				let okCallback = function () {
					let input = $("#common-popup input").val();
					input = StringUtils.cleanUpInput(input, maxLength);
					let ok = input && input.length > 0 && (inputCallback ? inputCallback(input) : true);
					if (ok) {
						confirmCallback(input);
						return true;
					} else {
						log.w("invalid input: " + input);
						return false;
					}
				};
				let cancelButtonLabel = allowCancel ? "Cancel" : null;
				let options = {
					isMeta: false,
					isDismissable: false,
					isCloseable: false,
				};
				
				this.popupManager.showPopup(title, msg, "Confirm", cancelButtonLabel, null, okCallback, null, options);

				var uiFunctions = this;
				var maxChar = 40;
				this.toggle("#common-popup-input-container", true);
				$("#common-popup-input-container input").attr("maxlength", maxChar);

				$("#common-popup input").val(defaultValue);
				$("#common-popup input").data("max-input-length", maxLength)
				$("#common-popup input").keydown(uiFunctions.onTextInputKeyDown);
				$("#common-popup input").keyup(uiFunctions.onTextInputKeyUp);
			},

			showGameOptions: function (show) {
				$("#game-options-extended").toggle(show);
				$("#btn-more").text(show ? "less" : "more");
				GlobalSignals.elementToggledSignal.dispatch($("#game-options-extended"), show);
			}
		});

		return UIFunctions;
	});

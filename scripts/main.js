import { Settings } from "./settings.js";
Hooks.once('init', () => {
    // Registering the settings
    Settings.registerSettings();
});
// Exporting the TurnSubscriber class as the default export of the module
export default class TurnSubscriber {
    // Static properties of the TurnSubscriber class
    static gmColor;
    static myTimer;
    static lastCombatant;
    static imgCount = 1;
    static currentImgID = null;
    static nextImgID;
    static expectedNext;
    static startCounterAtOne;
    static useTokens;
    static useNPCTokens;
    // Static method that starts the turn tracking
    static begin() {
        Hooks.on("ready", () => {
            // Wait for the GM to be available
            this.waitForGM().then((gm) => {
                // Store the GM color
                this.gmColor = gm.color;
                // Hook that triggers when the combat is updated
                Hooks.on("updateCombat", (combat, update, options, userId) => {
                    this._onUpdateCombat(combat, update, options, userId);
                });
                // Store the settings values
                this.startCounterAtOne = Settings.startCounterAtOne;
                this.useTokens = Settings.useTokens;
		this.useNPCTokens = Settings.useNPCTokens;
            });
        });
    }
    // Static method that waits for the GM to be available
    static async waitForGM() {
        const gm = game.users.find((u) => u.isGM && u.active);
        if (gm) {
            return gm;
        } else {
            // Wait until the GM becomes active
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    const gm = game.users.find((u) => u.isGM && u.active);
                    if (gm) {
                        clearInterval(interval);
                        resolve(gm);
                    }
                }, 1000);
            });
        }
    }
    // Static method that returns the HTML for a token image
    static getTokenImage(token) {
        const scale = token.getFlag("core", "tokenHUD.scale") || 1;
        const img = token.data.img;
        const size = Math.ceil(canvas.dimensions.size * scale);
        return `<img src="${img}" width="${size}" height="${size}" />`;
    }
    static getNamePf2eSupport(combat, combatant) {
        let ytName = combatant.name;
        if (combat._stats.systemId === 'pf2e') {
            const isVisible = combatant.isOwner || combatant.token.displayName >= 30;
            ytName = isVisible ? combatant.name : "Unknown Character";
        }

        return ytName;
    }
    // Static method that handles the updateCombat hook
    static _onUpdateCombat(combat, update, options, userId) {
        // Check if the turn or round has changed
        if (!update["turn"] && !update["round"]) return;
        // Check if the combat has started
        if (!combat.started) return;
        // Check if the current combatant has already been processed
        if (combat.combatant === this.lastCombatant) return;
        // Update the lastCombatant property to the current combatant
        this.lastCombatant = combat.combatant;
	if (Settings.getUseTokens()) {
		const token = combat?.combatant.token;
         	this.image = token.texture.src;
        }
		else {
			const token = combat?.combatant.token;
			if (Settings.getUseNPCTokens() && token.actor.type == "npc") {
				this.image = token.texture.src;
			}
			else {
                // Get the image of the current combatant's actor
                this.image = combat?.combatant.actor.img;
			}
        }		   
        // Get the name of the current combatant
        let ytName = this.getNamePf2eSupport(combat, combat?.combatant); //combat?.combatant.name;
        // Initialize the ytText and ytImgClass variables
        let ytText = "";
        const ytImgClass = ["adding"];
        // Check if the Combat Utility Belt module is active
        // if (game.modules.get("combat-utility-belt")?.active) {
        //     if (game.cub.hideNames.shouldReplaceName(combat?.combatant?.actor)) {
        //         ytName = game.cub.hideNames.getReplacementName(combat?.combatant?.actor);
        //     }
        // }
        // Determine the text to be displayed based on the current combatant
        if (combat?.combatant?.isOwner && !game.user.isGM && combat?.combatant?.players[0]?.active) {
            ytText = `${game.i18n.localize("YOUR-TURN.YourTurn")}, ${ytName}!`;
        } else if (combat?.combatant?.hidden && !game.user.isGM) {
            ytText = game.i18n.localize("YOUR-TURN.SomethingHappens");
            ytImgClass.push("silhoutte");
        } else {
	    //ytText = `${ytName} ist am Zug!`;
            ytText = `${ytName}'s ${game.i18n.localize("YOUR-TURN.Turn")}!`;
        }
        // Get the next combatant and the expected next combatant
        const nextCombatant = this.getNextCombatant(combat);
        const expectedNext = combat?.nextCombatant;
        // Get or create the container element for the turn display
        let container = document.getElementById("yourTurnContainer");
        if (!container) {
            const containerDiv = document.createElement("div");
            const uiTOP = document.getElementById("ui-top");
            containerDiv.id = "yourTurnContainer";
            uiTOP.appendChild(containerDiv);
            container = document.getElementById("yourTurnContainer");
        }
        // Check and delete the current and next turn images
        this.checkAndDelete(this.currentImgID);
        this.checkAndDelete("yourTurnBanner");
        const nextImg = document.getElementById(this.nextImgID);
        if (nextImg) {
            if (combat?.combatant !== this.expectedNext) {
                nextImg.remove();
                this.currentImgID = null;
            } else {
                this.currentImgID = this.nextImgID;
            }
        }
        // Increment the image count and generate the ID for the next image
        this.imgCount += 1;
        this.nextImgID = `yourTurnImg${this.imgCount}`;
        // Create the HTML element for the next image
        const imgHTML = document.createElement("img");
        imgHTML.id = this.nextImgID;
        imgHTML.className = "yourTurnImg";
		if (Settings.getUseTokens()) {
			const token = combat?.combatant.token;
	       		imgHTML.src = token.texture.src;
      		} else {
			const token = combat?.combatant.token;
			if (Settings.getUseNPCTokens() && token.actor.type == "npc") {
				imgHTML.src = token.texture.src;
            		}
			else {
            			imgHTML.src = expectedNext?.actor.img;
			}
		}
	    if (this.currentImgID === null) {
             // If there is no current image, create it
            this.currentImgID = `yourTurnImg${this.imgCount - 1}`;
            const currentImgHTML = document.createElement("img");
            currentImgHTML.id = this.currentImgID;
            currentImgHTML.className = "yourTurnImg";
            currentImgHTML.src = this.image;
            container.append(currentImgHTML);
        }
        // Create the banner HTML element
        const bannerDiv = document.createElement("div");
        const turnNumber = Settings.getStartCounterAtOne() ? combat.turn + 1 : combat.turn;
        bannerDiv.id = "yourTurnBanner";
        bannerDiv.className = "yourTurnBanner";
        bannerDiv.style.height = "150px";
        bannerDiv.innerHTML = `<p id="yourTurnText" class="yourTurnText">${ytText}</p><div class="yourTurnSubheading">${game.i18n.localize(
            "YOUR-TURN.Round"
        )} #${combat.round} ${game.i18n.localize("YOUR-TURN.Turn")} #${turnNumber}</div>${this.getNextTurnHtml(
            combat,
            nextCombatant
        )}<div id="yourTurnBannerBackground" class="yourTurnBannerBackground" height="150"></div>`;
        // Set the CSS variables for player and GM colors
        const r = document.querySelector(":root");
        if (combat?.combatant?.hasPlayerOwner && combat?.combatant?.players[0].active) {
            const ytPlayerColor = combat?.combatant?.players[0]["color"];
            r.style.setProperty("--yourTurnPlayerColor", ytPlayerColor);
            r.style.setProperty("--yourTurnPlayerColorTransparent", ytPlayerColor + "80");
        } else {
            r.style.setProperty("--yourTurnPlayerColor", this.gmColor);
            r.style.setProperty("--yourTurnPlayerColorTransparent", this.gmColor + "80");
        }
        // Add classes to the current image HTML element
        const currentImgHTML = document.getElementById(this.currentImgID);
        ytImgClass.forEach((className) => {
            currentImgHTML.classList.add(className);
        });
        // Append the image and banner elements to the container
        container.append(imgHTML);
        container.append(bannerDiv);
        // Clear the timer and start a new one to unload the image
        clearInterval(this.myTimer);
        this.myTimer = setInterval(() => {
            this.unloadImage();
        }, 5000);
        let imageHTML;
        // Check if tokens should be used instead of actor images
        if (Settings.getUseTokens()) {
            const token = combat?.combatant.token;
            if (token) {
                imageHTML = this.getTokenImage(token);
            }
        } else {
            imageHTML = `<img src="${expectedNext?.actor.img}" />`;
        }
    }
    // Static method that loads the image for the next turn
    static loadNextImage(combat) {
        const nextTurn = combat.turn + 1;
        const hiddenImgHTML = `<div id="yourTurnPreload"><img id="yourTurnPreloadImg" src=${combat?.turns[(combat.turn + 1) % combat.turns.length].actor.img
        } loading="eager" width="800" height="800"></img><div>`;
        const yourTurnPreloadDiv = document.querySelector("div#yourTurnPreload");
        if (yourTurnPreloadDiv) {
            yourTurnPreloadDiv.remove();
        }
        $("body").append(hiddenImgHTML);
    }
    // Static method that unloads the current image
    static unloadImage() {
        clearInterval(this.myTimer);
        const element = document.getElementById("yourTurnBannerBackground");
        element.classList.add("removing");
        const bannerElement = document.getElementById("yourTurnBanner");
        bannerElement.classList.add("removing");
        const currentImgElement = document.getElementById(this.currentImgID);
        currentImgElement.classList.add("removing");
    }
    // Static method that retrieves the next combatant
    static getNextCombatant(combat) {
        let j = 1;
        let combatant = combat?.turns[(combat.turn + j) % combat.turns.length];
        while (combatant.hidden && j < combat.turns.length && !game.user.isGM) {
            j++;
            combatant = combat?.turns[(combat.turn + j) % combat.turns.length];
        }
        return combatant;
    }
    // Static method that generates the HTML for the next turn
    static getNextTurnHtml(combat,combatant) {
        const displayNext = true;
        let name = this.getNamePf2eSupport(combat, combatant); // combatant.name;
        let imgClass = "yourTurnImg yourTurnSubheading";
        if (game.modules.get("combat-utility-belt")?.active) {
            if (game.cub.hideNames.shouldReplaceName(combatant?.actor)) {
                name = game.cub.hideNames.getReplacementName(combatant?.actor);
                imgClass += " silhoutte";
            }
        }
        if (displayNext) {
			if (Settings.getUseTokens()) {
			const token = combatant.token;
            const rv = `<div class="yourTurnSubheading last">${game.i18n.localize(
                "YOUR-TURN.NextUp"
            )}:  <img class="${imgClass}" src="${combatant.actor.img}"></img>${name}</div>`;
         		console.log(rv);
         		return rv;
           		}
			else {
				const token = combatant.token;
				if (Settings.getUseNPCTokens() && token.actor.type == "npc") {
					const rv = `<div class="yourTurnSubheading last">${game.i18n.localize(
					"YOUR-TURN.NextUp"
					)}:  <img class="${imgClass}" src="${token.texture.src}"></img>${name}</div>`;
					console.log(rv);
					return rv;
				} 
				else {
					 const rv = `<div class="yourTurnSubheading last">${game.i18n.localize(
					"YOUR-TURN.NextUp"
					)}:  <img class="${imgClass}" src="${combatant.actor.img}"></img>${name}</div>`;
					console.log(rv);
					return rv;
				} 
			}
		}
		else {
       		return null;
		}
    }
	// Static method that checks and deletes an element by ID
    static checkAndDelete(elementID) {
        const prevImg = document.getElementById(elementID);
        if (prevImg !== null) {
            prevImg.remove();
        }
    }
}
// Call the begin() method of TurnSubscriber to start the turn tracking
TurnSubscriber.begin();

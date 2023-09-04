import { Settings } from "./settings.js";
Hooks.once('init', () => {
    Settings.registerSettings();
});
export default class TurnSubscriber {
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
    static begin() {
        Hooks.on("ready", () => {
            this.waitForGM().then((gm) => {
                this.gmColor = gm.color;
                Hooks.on("updateCombat", (combat, update, options, userId) => {
                    this._onUpdateCombat(combat, update, options, userId);
                });
                this.startCounterAtOne = Settings.startCounterAtOne;
                this.useTokens = Settings.useTokens;
		this.useNPCTokens = Settings.useNPCTokens;
            });
        });
    }
    static async waitForGM() {
        const gm = game.users.find((u) => u.isGM && u.active);
        if (gm) {
            return gm;
        } else {
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
    static _onUpdateCombat(combat, update, options, userId) {
        if (!update["turn"] && !update["round"]) return;
        if (!combat.started) return;
        if (combat.combatant === this.lastCombatant) return;
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
           			this.image = combat?.combatant.actor.img;
			}
        }		   
        let ytName = combat?.combatant.name;
        let ytText = "";
        const ytImgClass = ["adding"];
        if (game.modules.get("combat-utility-belt")?.active) {
            if (game.cub.hideNames.shouldReplaceName(combat?.combatant?.actor)) {
                ytName = game.cub.hideNames.getReplacementName(combat?.combatant?.actor);
            }
        }
        if (combat?.combatant?.isOwner && !game.user.isGM && combat?.combatant?.players[0]?.active) {
            ytText = `${game.i18n.localize("YOUR-TURN.YourTurn")}, ${ytName}!`;
        } else if (combat?.combatant?.hidden && !game.user.isGM) {
            ytText = game.i18n.localize("YOUR-TURN.SomethingHappens");
            ytImgClass.push("silhoutte");
        } else {
	    //ytText = `${ytName} ist am Zug!`;
            ytText = `${ytName}'s ${game.i18n.localize("YOUR-TURN.Turn")}!`;
        }
        const nextCombatant = this.getNextCombatant(combat);
        const expectedNext = combat?.nextCombatant;
        let container = document.getElementById("yourTurnContainer");
        if (!container) {
            const containerDiv = document.createElement("div");
            const uiTOP = document.getElementById("ui-top");
            containerDiv.id = "yourTurnContainer";
            uiTOP.appendChild(containerDiv);
            container = document.getElementById("yourTurnContainer");
        }
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
        this.imgCount += 1;
        this.nextImgID = `yourTurnImg${this.imgCount}`;
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
            this.currentImgID = `yourTurnImg${this.imgCount - 1}`;
            const currentImgHTML = document.createElement("img");
            currentImgHTML.id = this.currentImgID;
            currentImgHTML.className = "yourTurnImg";
            currentImgHTML.src = this.image;
            container.append(currentImgHTML);
        }
        const bannerDiv = document.createElement("div");
        const turnNumber = Settings.getStartCounterAtOne() ? combat.turn + 1 : combat.turn;
        bannerDiv.id = "yourTurnBanner";
        bannerDiv.className = "yourTurnBanner";
        bannerDiv.style.height = "150px";
        bannerDiv.innerHTML = `<p id="yourTurnText" class="yourTurnText">${ytText}</p><div class="yourTurnSubheading">${game.i18n.localize(
      "YOUR-TURN.Round"
    )} #${combat.round} ${game.i18n.localize("YOUR-TURN.Turn")} #${turnNumber}</div>${this.getNextTurnHtml(
      nextCombatant
    )}<div id="yourTurnBannerBackground" class="yourTurnBannerBackground" height="150"></div>`;
        const r = document.querySelector(":root");
        if (combat?.combatant?.hasPlayerOwner && combat?.combatant?.players[0].active) {
            const ytPlayerColor = combat?.combatant?.players[0]["color"];
            r.style.setProperty("--yourTurnPlayerColor", ytPlayerColor);
            r.style.setProperty("--yourTurnPlayerColorTransparent", ytPlayerColor + "80");
        } else {
            r.style.setProperty("--yourTurnPlayerColor", this.gmColor);
            r.style.setProperty("--yourTurnPlayerColorTransparent", this.gmColor + "80");
        }
        const currentImgHTML = document.getElementById(this.currentImgID);
        ytImgClass.forEach((className) => {
            currentImgHTML.classList.add(className);
        });
        container.append(imgHTML);
        container.append(bannerDiv);
        clearInterval(this.myTimer);
        this.myTimer = setInterval(() => {
            this.unloadImage();
        }, 5000);
    }
    static loadNextImage(combat) {
        const nextTurn = combat.turn + 1;
        const hiddenImgHTML = `<div id="yourTurnPreload"><img id="yourTurnPreloadImg" src=${
      combat?.turns[(combat.turn + 1) % combat.turns.length].actor.img
    } loading="eager" width="800" height="800"></img><div>`;
        const yourTurnPreloadDiv = document.querySelector("div#yourTurnPreload");
        if (yourTurnPreloadDiv) {
            yourTurnPreloadDiv.remove();
        }
        $("body").append(hiddenImgHTML);
    }
    static unloadImage() {
        clearInterval(this.myTimer);
        const element = document.getElementById("yourTurnBannerBackground");
        element.classList.add("removing");
        const bannerElement = document.getElementById("yourTurnBanner");
        bannerElement.classList.add("removing");
        const currentImgElement = document.getElementById(this.currentImgID);
        currentImgElement.classList.add("removing");
    }
    static getNextCombatant(combat) {
        let j = 1;
        let combatant = combat?.turns[(combat.turn + j) % combat.turns.length];
        while (combatant.hidden && j < combat.turns.length && !game.user.isGM) {
            j++;
            combatant = combat?.turns[(combat.turn + j) % combat.turns.length];
        }
        return combatant;
    }
    static getNextTurnHtml(combatant) {
        const displayNext = true;
        let name = combatant.name;
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
			)}:  <img class="${imgClass}" src="${token.texture.src}"></img>${name}</div>`;
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
	
    static checkAndDelete(elementID) {
        const prevImg = document.getElementById(elementID);
        if (prevImg !== null) {
            prevImg.remove();
        }
    }
}
TurnSubscriber.begin();

const modName = 'your-turn';
const settings = {
    startCounterAtOne: {
        name: 'Start Turn Counter at 1',
        hint: 'Toggle to start the turn counter at 1 instead of 0.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    },
    useTokens: {
        name: 'Use Tokens Instead of Artwork',
        hint: 'Toggle to use tokens for Your Turn instead of full actor artwork.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    },
    useNPCTokens: {
        name: 'Use Tokens Instead of Artwork only for NPCs',
        hint: 'Toggle to use tokens for NPCs only instead of full actor artwork.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    },
};

export class Settings {
    static getStartCounterAtOne() {
        return game.settings.get(modName, 'startCounterAtOne');
    }

    static getUseTokens() {
        return game.settings.get(modName, 'useTokens');
    }
	
	static getUseNPCTokens() {
        return game.settings.get(modName, 'useNPCTokens');
    }

    static registerSettings() {
        for (const [name, setting] of Object.entries(settings)) {
            game.settings.register(modName, name, setting);
        }
    }
}

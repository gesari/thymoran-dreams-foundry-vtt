/**
 * Extends the basic Item class
 * @extends {Item}
 */
export class ThymoranDreamsItem extends Item {
    /**
     * Augment the basic Item data model with additional dynamic data
     */
    prepareData() {
        // As with the Actor class, items are documents that can have their data
        // preparation methods overridden (such as prepareBaseData()).
        super.prepareBaseData();
    }

    /**
     * Prepare a data object which defines the data schema used by dice roll commands against the Item
     * @override
     */
    getRollData() {
        // Starts off by populating the roll data with a shallow copy of `this.system`
        const rollData = { ...this.system};

        // Quit early if there's no parent actor
        if (!this.actor) return rollData;

        // If present, add the actor's roll data
        rollData.actor = this.actor.getRollData();

        return rollData;
    }

    /**
     * Handle clickable rolls
     * @param {Event} event   The originating click event
     * @private
     */
    async roll(event) {
        const item = this;

        // Initialize chat data
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');
        const label = `[${item.type}] ${item.name}`;

        // If there's no roll data, generate error message in chat
        if (!this.system.formula) {
            ChatMessage.create({
                speaker: speaker,
                rollMode: rollMode,
                flavor: label,
                content: item.system.description ?? '',
            });
        }
        // Otherwise, create a roll and generate message for it
        else {
            // Retrieve roll data
            const rollData = this.getRollData();

            // Invoke the roll and submit it to chat
            const roll = new Roll(rollData.formula, rollData.actor);
            // If you need to store the value first, uncomment the next line
            // const result = await roll.evaluate();
            roll.toMessage({
                speaker: speaker,
                rollMode: rollMode,
                flavor: label,
            });
            return roll;
        }
    }
}
import ThymoranDreamsActorBase from "./base-actor.mjs";

export default class ThymoranDreamsPlayer extends ThymoranDreamsActorBase {
    static LOCALIZATION_PREFIXES = [
        ...super.LOCALIZATION_PREFIXES,
        'THYMORANDREAMS.Actor.Player',
    ];

    static defineSchema() {
        const fields = foundry.data.fields;
        const requiredInteger = { required: true, nullable: false, integer: true };
        const schema = super.defineSchema();

        schema.advancement = new fields.SchemaField({
            level: new fields.SchemaField({
                value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            }),
            // add in Spell Tier here?
        });

        // Iterate over stat names and create a new SchemaField for each
        schema.stats = new fields.SchemaField(
            Object.keys(CONFIG.THYMORANDREAMS.stats).reduce((obj, stat) => {
                obj[stat] = new fields.SchemaField({
                    value: new fields.NumberField({
                        ...requiredInteger,
                        initial: 10,
                        min: 0,
                    }),
                });
                return obj;
            }, {})
        );

        return schema;
    }

    prepareDerivedData() {
        for (const key in this.stats) {
            // Loop for calculating D&D ability modifiers occurs here
            // Probably the place for Secondaries to be calculated?
            // Also may have other things like Spell Tier calculated here instead of above


            // Handle ability label localization
            this.stats[key].label = game.i18n.localize(CONFIG.THYMORANDREAMS.stats[key]) ?? key;
        }
    }

    getRollData() {
        const data = {};

        // Copy stats to the top level, so rolls can use
        // formulas like `@str.mod + 4`
        // May or may not be useful for TD relative to D&D, but leaving in for now because I can't tell the difference
        if (this.stats) {
            for (let [k, v] of Object.entries(this.stats)) {
                data[k] = foundry.utils.deepClone(v);
            }
        }

        data.lvl = this.stats.level.value;

        return data;
    }
}
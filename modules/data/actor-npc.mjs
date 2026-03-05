import ThymoranDreamsActorBase from "./base-actor.mjs";

export default class ThymoranDreamsNPC extends ThymoranDreamsActorBase {
    static LOCALIZATION_PREFIXES = [
        ...super.LOCALIZATION_PREFIXES,
        'THYMORANDREAMS.Actor.NPC',
    ];

    static defineSchema() {
        const fields = foundry.data.fields;
        const requiredInteger = { required: true, nullable: false, integer: true };
        const schema = super.defineSchema();

        schema.spellTier = new fields.NumberField({
            ...requiredInteger,
            initial: 1,
            min: 0,
        });

        return schema;
    }

    // prepareDerivedData() {
      // Boilerplate had xp calculated here based on CR
      // Not applicable to TD in the same way as D&D, but keeping here for reference
    // }
}
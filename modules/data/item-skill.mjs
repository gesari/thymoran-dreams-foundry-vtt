import ThymoranDreamsItemBase from "./base-item.mjs";

export default class ThymoranDreamsSkill extends ThymoranDreamsItemBase {
    static LOCALIZATION_PREFIXES = [
        'THYMORANDREAMS.Item.base',
        'THYMORANDREAMS.Item.Skill',
    ];

    static defineSchema() {
        const fields = foundry.data.fields;
        const schema = super.defineSchema();

        // Normally implementation for spell level assortment here
        // Could apply to Spell Tiers, but leave out for now

        return schema;
    }
}
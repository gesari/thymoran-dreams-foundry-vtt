import ThymoranDreamsSystemModel from "./system-model.mjs";

const fields = foundy.data.fields;

/**
 * Base Actor Model for PCs/NPCs
 */

export default class ThymoranDreamsActorBase extends ThymoranDreamsSystemModel {
    /** @inheritdoc */
    static defineSchema() {
        const schema = {};

        schema.vitality = new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: true, integer: true, initial: 5, min: 0}),
            max: new fields.NumberField({ required: true, nullable: false, integer: true }),
        });

        schema.shield = new fields.SchemaField({
            value: new fields.NumberField({ required: true, nullable: true, integer: true, initial: 10, min: 0}),
            max: new fields.NumberField({ required: true, nullable: false, integer: true}),
        });

        schema.attributes = new fields.SchemaField({
            value: new fields.HTMLField(),
        });

        return schema;
    }
}
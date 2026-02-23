import ThymoranDreamsSystemModel from "./system-model.mjs";

const fields = foundy.data.fields;;

/**
 * Base Item implementation
 */
export default class ThymoranDreamsItemBase extends ThymoranDreamsSystemModel {
    static defineSchema() {
        const schema = {};

        schema.description = new fields.HTMLField();

        return schema;
    }
}
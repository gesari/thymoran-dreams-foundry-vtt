/**
 * Borrowed from DrawSteel System implementation for metadata purposes
 * Subclass of TypeDataModel that adds handling for pseudo documents.
 */
export default class ThymoranDreamsSystemModel extends foundry.abstract.TypeDataModel {
  /**
     * Metadata for this document subtype.
     * @type {SubtypeMetadata}
     */
  static get metadata() {
    return {
      embedded: {},
    };
  }
}